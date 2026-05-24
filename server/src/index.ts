import { buildApp } from "./app.js";
import { closeDb } from "./db/index.js";
import { setupSocket } from "./socket/index.js";

const app = await buildApp();

const io = setupSocket(app.server);

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  app.log.info(
    {
      signal,
    },
    "FlexChat shutdown started"
  );

  try {
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });

    await app.close();
    await closeDb();

    app.log.info(
      "FlexChat shutdown completed"
    );

    process.exit(0);
  } catch (error) {
    app.log.error(
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

process.on(
  "unhandledRejection",
  (reason) => {
    app.log.error(
      {
        err: reason,
      },
      "Unhandled promise rejection"
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    app.log.error(
      {
        err: error,
      },
      "Uncaught exception"
    );

    void shutdown("uncaughtException");
  }
);

const DEFAULT_PORT = 5000;
const HOST = "0.0.0.0";

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

const PORT = getPort();

app.log.info(
  {
    host: HOST,
    port: PORT,
  },
  "FlexChat server starting"
);

const address = await app.listen({
  port: PORT,
  host: HOST,
});

app.log.info(
  {
    address,
    host: HOST,
    port: PORT,
  },
  `FlexChat server running on port ${PORT}`
);
