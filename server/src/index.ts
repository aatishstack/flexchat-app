import { buildApp }
  from "./app.js";

import { db }
  from "./db/index.js";

import { env }
  from "./config/env.js";

import { setupSocket }
  from "./modules/socket/socket.js";

const start = async () => {
  try {
    await db.execute("SELECT 1");

    console.log(
      "Database connected"
    );

    const app =
      await buildApp();

    setupSocket(app.server);

    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });

    console.log(
      `Server running on port ${env.PORT}`
    );

  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

start();