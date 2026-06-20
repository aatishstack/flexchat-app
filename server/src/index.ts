import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  logFatalStartupError,
  logStartupStep,
} from "./lib/startup-diagnostics.js";

type ServerApp = Awaited<
  ReturnType<typeof import("./app.js")["buildApp"]>
>;
type SocketServer = ReturnType<
  typeof import("./socket/index.js")["setupSocket"]
>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = 8080;
const HOST = "0.0.0.0";
let app: ServerApp | undefined;
let io: SocketServer | undefined;
let closeDatabase: (() => Promise<void>) | undefined;
let mediaCleanupTimer: ReturnType<typeof setInterval> | undefined;
let shuttingDown = false;
let currentStartupStage = "startup:bootstrap";

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

async function runOptionalStartupStage<T>(
  stage: string,
  action: () => Promise<T> | T,
) {
  const startedAt = Date.now();

  startupLog("info", stage, "FlexChat optional startup stage started");

  try {
    const result = await action();

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
    // A single unhandled promise rejection must NOT terminate the process.
    // Terminating here caused Railway restart cascades (dropped sockets,
    // 502s, stuck message sends). Log and isolate the transient failure
    // instead; only genuinely fatal uncaught exceptions trigger shutdown.
    startupLog(
      "error",
      "runtime:unhandledRejection",
      "Unhandled promise rejection (isolated, process continuing)",
      {
        err: serializeError(reason),
      },
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    logFatalStartupError("runtime:uncaughtException", error);
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

async function initializeSentry(
  env: typeof import("./config/env.js")["env"],
) {
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

  const Sentry = await import("@sentry/node");

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: 1.0,
  });
}

function configureHttpServer(
  serverApp: ServerApp,
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

    if (closeDatabase) {
      await closeDatabase();
    }

    try {
      const { closeRedis } = await import("./lib/redis.js");
      await closeRedis();
    } catch (error) {
      logger.warn?.({ err: error }, "FlexChat redis shutdown failed");
    }

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
  logStartupStep("startup:banner", "FlexChat server startup beginning");

  currentStartupStage = "runtime:diagnostics";
  logRuntimeDiagnostics();

  currentStartupStage = "env:parse";
  logStartupStep("env:parse", "Parsing startup environment");
  const { env } = await import("./config/env.js");
  logStartupStep("env:parse", "Startup environment parsed successfully");

  currentStartupStage = "database:init";
  logStartupStep("database:init", "Initializing database client");
  const databaseModule = await import("./db/index.js");
  closeDatabase = databaseModule.closeDb;
  logStartupStep("database:init", "Database client initialized successfully");

  currentStartupStage = "application:imports";
  const [appModule, mediaModule, socketModule] = await Promise.all([
    import("./app.js"),
    import("./services/media.service.js"),
    import("./socket/index.js"),
  ]);

  await runOptionalStartupStage(
    "sentry:init",
    () => initializeSentry(env),
  );

  currentStartupStage = "runtime:port";
  const PORT = getPort();

  currentStartupStage = "fastify:buildApp";
  logStartupStep("fastify:buildApp", "Building Fastify application");
  const serverApp = await runRequiredStartupStage(
    "fastify:buildApp",
    appModule.buildApp,
  );

  app = serverApp;

  currentStartupStage = "http:configure";
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

  currentStartupStage = "fastify:listen";
  logStartupStep("fastify:listen", "Starting HTTP listener");
  const address = await runRequiredStartupStage(
    "fastify:listen",
    () => serverApp.listen({ port: PORT, host: HOST }),
  );

  logStartupStep("fastify:listen", "HTTP listener started successfully");
  serverApp.log.info(
    { address, host: HOST, port: PORT },
    `FlexChat server running on port ${PORT}`,
  );

  currentStartupStage = "socket:init";
  io = await runOptionalStartupStage(
    "socket:init",
    () => socketModule.setupSocket(serverApp.server),
  );

  currentStartupStage = "mediaCleanup:start";
  mediaCleanupTimer = await runOptionalStartupStage(
    "mediaCleanup:start",
    mediaModule.startMediaCleanup,
  );

  currentStartupStage = "startup:complete";
}

void main().catch((error) => {
  logFatalStartupError(currentStartupStage, error);
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
