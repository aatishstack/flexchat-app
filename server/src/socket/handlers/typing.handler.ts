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
  Map<string, Set<string>>
>();

function getConversationTypingUsers(
  conversationId: string
) {
  return Array.from(
    typingMap.get(conversationId)?.keys() ?? []
  );
}

function emitTypingUsers(
  io: Server,
  conversationId: string
) {
  io.to(conversationId).emit(
    SOCKET_EVENTS.TYPING_USERS,
    {
      conversationId,
      users:
        getConversationTypingUsers(conversationId),
    }
  );
}

function removeSocketFromTypingRoom(
  conversationId: string,
  userId: string,
  socketId: string
) {
  const roomTyping =
    typingMap.get(conversationId);

  const userSockets =
    roomTyping?.get(userId);

  userSockets?.delete(socketId);

  if (userSockets && !userSockets.size) {
    roomTyping?.delete(userId);
  }

  if (roomTyping && !roomTyping.size) {
    typingMap.delete(conversationId);
  }
}

function removeSocketFromAllTypingRooms(
  userId: string,
  socketId: string
) {
  const changedRooms: string[] = [];

  typingMap.forEach((_users, roomId) => {
    const before =
      getConversationTypingUsers(roomId).join(",");

    removeSocketFromTypingRoom(
      roomId,
      userId,
      socketId
    );

    const after =
      getConversationTypingUsers(roomId).join(",");

    if (before !== after) {
      changedRooms.push(roomId);
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
        new Map<string, Set<string>>();

      const userSockets =
        typingUsers.get(userId) ??
        new Set<string>();

      userSockets.add(socket.id);
      typingUsers.set(userId, userSockets);
      typingMap.set(conversationId, typingUsers);

      emitTypingUsers(io, conversationId);
    }
  );

  socket.on(
    SOCKET_EVENTS.STOP_TYPING,
    ({ conversationId }: TypingPayload) => {
      if (!conversationId) {
        return;
      }

      removeSocketFromTypingRoom(
        conversationId,
        userId,
        socket.id
      );

      emitTypingUsers(io, conversationId);
    }
  );

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    const changedRooms =
      removeSocketFromAllTypingRooms(userId, socket.id);

    changedRooms.forEach((conversationId) => {
      emitTypingUsers(io, conversationId);
    });
  });
}
