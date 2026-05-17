import type { Server as HttpServer } from "http";

import { Server } from "socket.io";

import { authenticateSocket } from "./socket-auth.js";
import { SOCKET_EVENTS } from "./socket-events.js";
import {
  addOnlineSocket,
  getOnlineUserIds,
  removeOnlineSocket,
} from "./socket-store.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { registerTypingHandlers } from "./handlers/typing.handler.js";

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  io.use(async (socket, next) => {
    const authenticated =
      await authenticateSocket(socket);

    if (!authenticated) {
      next(new Error("Unauthorized"));
      return;
    }

    next();
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.data.user.id as string;

    addOnlineSocket(userId, socket.id);
    socket.join(`user:${userId}`);

    io.emit(
      SOCKET_EVENTS.ONLINE_USERS,
      getOnlineUserIds()
    );

    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      removeOnlineSocket(socket.id);

      io.emit(
        SOCKET_EVENTS.ONLINE_USERS,
        getOnlineUserIds()
      );
    });
  });

  return io;
}
