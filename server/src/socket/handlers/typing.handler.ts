import {
  Server,
  Socket,
} from "socket.io";

import { SOCKET_EVENTS } from "../socket-events.js";

const typingMap =
  new Map<
    string,
    Set<string>
  >();

export function registerTypingHandlers(
  io: Server,
  socket: Socket
) {
  socket.on(
    SOCKET_EVENTS.START_TYPING,

    ({
      conversationId,
    }) => {
      if (
        !typingMap.has(
          conversationId
        )
      ) {
        typingMap.set(
          conversationId,
          new Set()
        );
      }

      typingMap
        .get(
          conversationId
        )
        ?.add(
          socket.data.user.id
        );

      io.to(
        conversationId
      ).emit(
        SOCKET_EVENTS.TYPING_USERS,
        Array.from(
          typingMap.get(
            conversationId
          ) || []
        )
      );
    }
  );

  socket.on(
    SOCKET_EVENTS.STOP_TYPING,

    ({
      conversationId,
    }) => {
      typingMap
        .get(
          conversationId
        )
        ?.delete(
          socket.data.user.id
        );

      io.to(
        conversationId
      ).emit(
        SOCKET_EVENTS.TYPING_USERS,
        Array.from(
          typingMap.get(
            conversationId
          ) || []
        )
      );
    }
  );
}