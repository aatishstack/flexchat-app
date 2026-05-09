import dotenv from "dotenv";

dotenv.config();

import { createServer } from "http";

import { Server } from "socket.io";

import { buildApp } from "./app";

import { setupSocket } from "./socket";

async function startServer() {

  const app = await buildApp();

  const httpServer =
    createServer(app.server);

  const io = new Server(
    httpServer,
    {
      cors: {
        origin: "*",
      },
    }
  );

  setupSocket(io);

  const PORT = Number(
    process.env.PORT || 5000
  );

  httpServer.listen(PORT, () => {

    console.log(
      `🚀 FlexChat backend running on port ${PORT}`
    );
  });
}

startServer();