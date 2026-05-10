import Fastify from "fastify";
import fastifyCors from "@fastify/cors";

import { createServer } from "http";
import { Server } from "socket.io";

import { registerSocketHandlers } from "./modules/socket/socket.js";

const app = Fastify({
  logger: true,
});

const startServer = async () => {
  try {
    await app.register(fastifyCors as any, {
      origin: "*",
    });

    app.get("/", async () => {
      return {
        message: "FlexChat API Running",
      };
    });

    const httpServer = createServer(app.server);

    const io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });

    registerSocketHandlers(io);

    const PORT = 5000;

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    app.log.error(error);

    process.exit(1);
  }
};

startServer();