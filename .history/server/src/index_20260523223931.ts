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

const PORT =
  Number(process.env.PORT) || 5000;

app.log.info(
  `FlexChat server running on port ${PORT}`
);

await app.listen({
  port: PORT,
  host: "0.0.0.0",
});