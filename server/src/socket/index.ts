import { Server as HttpServer } from "http";
import { Server } from "socket.io";

import { verifySocketToken } from "./auth.js";
import { registerSocketEvents } from "./events.js";

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    const user = await verifySocketToken(token);

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = user;

    next();
  });

  io.on("connection", (socket) => {
    registerSocketEvents(io, socket);
  });

  return io;
}