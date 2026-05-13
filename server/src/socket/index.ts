import {
  Server,
} from "socket.io";

import {
  authenticateSocket,
} from "./socket-auth.js";

import {
  SOCKET_EVENTS,
} from "./socket-events.js";

import {
  onlineUsers,
} from "./socket-store.js";

import {
  registerMessageHandlers,
} from "./handlers/message.handler.js";

import {
  registerTypingHandlers,
} from "./handlers/typing.handler.js";

export function setupSocket(
  server: any
) {
  const io = new Server(
    server,
    {
      cors: {
        origin: "*",
      },
    }
  );

  io.on(
    SOCKET_EVENTS.CONNECTION,
    async (socket) => {
      const authenticated =
        await authenticateSocket(
          socket
        );

      if (
        !authenticated
      ) {
        socket.disconnect();

        return;
      }

      const userId =
        socket.data.user.id;

      onlineUsers.set(
        userId,
        socket.id
      );

      io.emit(
        SOCKET_EVENTS.ONLINE_USERS,
        Array.from(
          onlineUsers.keys()
        )
      );

      socket.on(
        SOCKET_EVENTS.JOIN_CONVERSATION,
        (
          conversationId
        ) => {
          socket.join(
            conversationId
          );
        }
      );

      registerMessageHandlers(
        io,
        socket
      );

      registerTypingHandlers(
        io,
        socket
      );

      socket.on(
        SOCKET_EVENTS.DISCONNECT,
        () => {
          onlineUsers.delete(
            userId
          );

          io.emit(
            SOCKET_EVENTS.ONLINE_USERS,
            Array.from(
              onlineUsers.keys()
            )
          );
        }
      );
    }
  );

  return io;
}