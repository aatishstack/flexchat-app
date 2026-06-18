import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import * as Sentry from "@sentry/node";

import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import {
  closeDb,
  getDatabaseStartupStatus,
} from "./db/index.js";
import { startMediaCleanup } from "./services/media.service.js";
import { setupSocket } from "./socket/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = 8080;
const HOST = "0.0.0.0";
let app: Awaited<ReturnType<typeof buildApp>> | undefined;
let io: ReturnType<typeof setupSocket> | undefined;
let mediaCleanupTimer: ReturnType<typeof setInterval> | undefined;
let shuttingDown = false;

type StartupLogLevel = "info" | "warn" | "error";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

function startupLog(
  level: StartupLogLevel,
  stage: string,
  message: string,
  detail: Record<string, unknown> = {},
) {
  const payload = {
    stage,
    ...detail,
  };

  if (app) {
    if (level === "error") {
      app.log.error(payload, message);
      return;
    }

    if (level === "warn") {
      app.log.warn(payload, message);
      return;
    }

    app.log.info(payload, message);
    return;
  }

  const line = JSON.stringify({
    level,
    msg: message,
    ...payload,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

async function runRequiredStartupStage<T>(
  stage: string,
  action: () => Promise<T> | T,
) {
  const startedAt = Date.now();

  startupLog("info", stage, "FlexChat startup stage started");

  try {
    const result = await action();

    startupLog(
      "info",
      stage,
      "FlexChat startup stage completed",
      {
        durationMs: Date.now() - startedAt,
      },
    );

    return result;
  } catch (error) {
    startupLog(
      "error",
      stage,
      "FlexChat startup stage failed",
      {
        durationMs: Date.now() - startedAt,
        err: serializeError(error),
      },
    );

    throw error;
  }
}

function runOptionalStartupStage<T>(
  stage: string,
  action: () => T,
) {
  const startedAt = Date.now();

  startupLog("info", stage, "FlexChat optional startup stage started");

  try {
    const result = action();

    startupLog(
      "info",
      stage,
      "FlexChat optional startup stage completed",
      {
        durationMs: Date.now() - startedAt,
      },
    );

    return result;
  } catch (error) {
    startupLog(
      "error",
      stage,
      "FlexChat optional startup stage failed",
      {
        durationMs: Date.now() - startedAt,
        err: serializeError(error),
      },
    );

    return undefined;
  }
}

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "Unhandled promise rejection",
      reason,
    );

    void shutdown("unhandledRejection");
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "Uncaught exception",
      error,
    );

    void shutdown("uncaughtException");
  }
);

function logRuntimeDiagnostics() {
  const diagnostics = {
    cwd: process.cwd(),
    dirname: __dirname,
    filename: __filename,
    nodeEnv: process.env.NODE_ENV,
    portEnv: process.env.PORT,
    distIndexExists: fs.existsSync("./dist/index.js"),
    packageJsonExists: fs.existsSync("./package.json"),
    nodeModulesExists: fs.existsSync("./node_modules"),
  };

  startupLog(
    "info",
    "runtime:diagnostics",
    "FlexChat runtime diagnostics",
    diagnostics,
  );
}

function logDependencyDiagnostics() {
  const databaseStatus = getDatabaseStartupStatus();
  const cloudinaryConfigured = Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );

  startupLog(
    "info",
    "dependencies:config",
    "FlexChat dependency configuration loaded",
    {
      databaseConfigured: databaseStatus.configured,
      databaseInitialized: databaseStatus.initialized,
      databaseStartupError: databaseStatus.startupError
        ? serializeError(databaseStatus.startupError)
        : undefined,
      redisConfigured: false,
      redisStatus: "not used by this service",
      cloudinaryConfigured,
      firebaseProjectConfigured: Boolean(env.FIREBASE_PROJECT_ID),
      firebaseServiceAccountConfigured: Boolean(
        env.FIREBASE_SERVICE_ACCOUNT_JSON,
      ),
      sentryConfigured: Boolean(env.SENTRY_DSN),
      turnRelayConfigured: Boolean(
        env.TURN_SERVER_URLS && env.TURN_AUTH_SECRET,
      ),
    },
  );
}

function getPort() {
  if (!process.env.PORT) {
    return DEFAULT_PORT;
  }

  const port = Number(process.env.PORT);

  if (
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65_535
  ) {
    throw new Error(
      `Invalid PORT value: ${process.env.PORT}`
    );
  }

  return port;
}

function initializeSentry() {
  if (!env.SENTRY_DSN) {
    startupLog(
      "info",
      "sentry:init",
      "Sentry is not configured",
      {
        configured: false,
      },
    );
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: 1.0,
  });
}

function configureHttpServer(
  serverApp: Awaited<ReturnType<typeof buildApp>>,
) {
  serverApp.server.on("connection", (socket) => {
    socket.setKeepAlive(true, 15_000);
    socket.setTimeout(0);
  });
  serverApp.server.setTimeout(0);
  serverApp.server.keepAliveTimeout = 120_000;
  serverApp.server.headersTimeout = 125_000;
}

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  const logger = app?.log ?? console;
  const forceExitTimer = setTimeout(() => {
    logger.error(
      {
        signal,
      },
      "FlexChat shutdown timed out",
    );
    process.exit(1);
  }, 10_000);

  forceExitTimer.unref?.();

  logger.info(
    {
      signal,
    },
    "FlexChat shutdown started"
  );

  try {
    if (io) {
      await new Promise<void>((resolve) => {
        io?.close(() => resolve());
      });
    }

    if (mediaCleanupTimer) {
      clearInterval(mediaCleanupTimer);
    }

    if (app) {
      await app.close();
    }

    await closeDb();

    clearTimeout(forceExitTimer);

    logger.info(
      "FlexChat shutdown completed"
    );

    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);

    logger.error(
      {
        err: error,
      },
      "FlexChat shutdown failed"
    );

    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

async function main() {
  logRuntimeDiagnostics();
  logDependencyDiagnostics();

  runOptionalStartupStage("sentry:init", initializeSentry);

  const PORT = getPort();

  const serverApp = await runRequiredStartupStage(
    "fastify:buildApp",
    buildApp,
  );

  app = serverApp;

  await runRequiredStartupStage(
    "http:configure",
    () => configureHttpServer(serverApp),
  );

  serverApp.log.info(
    {
      host: HOST,
      port: PORT,
    },
    "FlexChat server starting",
  );

  const address = await runRequiredStartupStage(
    "fastify:listen",
    () => serverApp.listen({ port: PORT, host: HOST }),
  );

  serverApp.log.info(
    { address, host: HOST, port: PORT },
    `FlexChat server running on port ${PORT}`,
  );

  io = runOptionalStartupStage(
    "socket:init",
    () => setupSocket(serverApp.server),
  );

  mediaCleanupTimer = runOptionalStartupStage(
    "mediaCleanup:start",
    startMediaCleanup,
  );
}

void main().catch((error) => {
  startupLog(
    "error",
    "startup:fatal",
    "FlexChat startup failed",
    {
      err: serializeError(error),
    },
  );

  process.exit(1);
});
