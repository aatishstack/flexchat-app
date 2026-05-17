import {
  Server,
  Socket,
} from "socket.io";

import { SOCKET_EVENTS } from "../socket-events.js";

type TypingPayload = {
  conversationId?: string;
};

const typingMap = new Map<
  string,
  Set<string>
>();

function getConversationTypingUsers(
  conversationId: string
) {
  return Array.from(
    typingMap.get(conversationId) ?? []
  );
}

function removeUserFromAllTypingRooms(
  userId: string
) {
  const changedRooms: string[] = [];

  typingMap.forEach((users, roomId) => {
    if (users.delete(userId)) {
      changedRooms.push(roomId);
    }

    if (!users.size) {
      typingMap.delete(roomId);
    }
  });

  return changedRooms;
}

export function registerTypingHandlers(
  io: Server,
  socket: Socket
) {
  const userId = socket.data.user.id as string;

  socket.on(
    SOCKET_EVENTS.START_TYPING,
    ({ conversationId }: TypingPayload) => {
      if (!conversationId) {
        return;
      }

      const typingUsers =
        typingMap.get(conversationId) ??
        new Set<string>();

      typingUsers.add(userId);
      typingMap.set(conversationId, typingUsers);

      socket.to(conversationId).emit(
        SOCKET_EVENTS.TYPING_USERS,
        getConversationTypingUsers(conversationId)
      );
    }
  );

  socket.on(
    SOCKET_EVENTS.STOP_TYPING,
    ({ conversationId }: TypingPayload) => {
      if (!conversationId) {
        return;
      }

      const typingUsers =
        typingMap.get(conversationId);

      typingUsers?.delete(userId);

      if (
        typingUsers &&
        !typingUsers.size
      ) {
        typingMap.delete(
          conversationId
        );
      }

      socket.to(conversationId).emit(
        SOCKET_EVENTS.TYPING_USERS,
        getConversationTypingUsers(conversationId)
      );
    }
  );

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    const changedRooms =
      removeUserFromAllTypingRooms(userId);

    changedRooms.forEach((conversationId) => {
      io.to(conversationId).emit(
        SOCKET_EVENTS.TYPING_USERS,
        getConversationTypingUsers(conversationId)
      );
    });
  });
}
