import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { buildApp } from "./app.js";
import { closeDb } from "./db/index.js";
import { setupSocket } from "./socket/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = 8080;
const HOST = "0.0.0.0";
let app: Awaited<ReturnType<typeof buildApp>> | undefined;
let io: ReturnType<typeof setupSocket> | undefined;
let shuttingDown = false;

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "Unhandled promise rejection",
      reason,
    );
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

  console.info(
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

logRuntimeDiagnostics();

const serverApp = await buildApp();

app = serverApp;

serverApp.server.on("connection", (socket) => {
  socket.setKeepAlive(true, 15_000);
  socket.setTimeout(0);
});
serverApp.server.setTimeout(0);
serverApp.server.keepAliveTimeout = 120_000;
serverApp.server.headersTimeout = 125_000;

io = setupSocket(serverApp.server);

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  const logger = app?.log ?? console;

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

    if (app) {
      await app.close();
    }

    await closeDb();

    logger.info(
      "FlexChat shutdown completed"
    );

    process.exit(0);
  } catch (error) {
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

const PORT = getPort();

serverApp.log.info(
  {
    host: HOST,
    port: PORT,
  },
  "FlexChat server starting"
);

const address = await serverApp.listen({
  port: PORT,
  host: HOST,
});

serverApp.log.info(
  {
    address,
    host: HOST,
    port: PORT,
  },
  `FlexChat server running on port ${PORT}`
);
