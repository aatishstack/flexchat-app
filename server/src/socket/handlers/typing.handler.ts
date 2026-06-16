import {
  Server,
  Socket,
} from "socket.io";

import { z } from "zod";

import { isConversationMember } from "../../lib/conversation-access.js";
import { SOCKET_EVENTS } from "../socket-events.js";

type TypingPayload = {
  conversationId?: string;
};

const typingPayloadSchema = z.object({
  conversationId:
    z.string().trim().min(1).max(128),
});

const typingMap = new Map<
  string,
  Map<string, Set<string>>
>();

const TYPING_TTL_MS = 6_000;
const TYPING_EVENT_THROTTLE_MS = 450;

const typingExpiryTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const lastTypingEventBySocket = new Map<
  string,
  number
>();

function canEmitTypingEvent(socketId: string) {
  const now = Date.now();
  const lastEventAt =
    lastTypingEventBySocket.get(socketId) ?? 0;

  if (
    now - lastEventAt <
    TYPING_EVENT_THROTTLE_MS
  ) {
    return false;
  }

  lastTypingEventBySocket.set(socketId, now);
  return true;
}

function typingTimerKey(
  conversationId: string,
  userId: string,
  socketId: string
) {
  return `${conversationId}:${userId}:${socketId}`;
}

function clearTypingExpiry(
  conversationId: string,
  userId: string,
  socketId: string
) {
  const key = typingTimerKey(
    conversationId,
    userId,
    socketId
  );
  const timer =
    typingExpiryTimers.get(key);

  if (!timer) {
    return;
  }

  clearTimeout(timer);
  typingExpiryTimers.delete(key);
}

function scheduleTypingExpiry(
  io: Server,
  conversationId: string,
  userId: string,
  socketId: string
) {
  clearTypingExpiry(
    conversationId,
    userId,
    socketId
  );

  const key = typingTimerKey(
    conversationId,
    userId,
    socketId
  );
  const timer = setTimeout(() => {
    removeSocketFromTypingRoom(
      conversationId,
      userId,
      socketId
    );
    emitTypingUsers(io, conversationId);
  }, TYPING_TTL_MS);

  timer.unref?.();
  typingExpiryTimers.set(key, timer);
}

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
  clearTypingExpiry(
    conversationId,
    userId,
    socketId
  );

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

async function canAccessConversation(
  socket: Socket,
  userId: string,
  conversationId: string
) {
  try {
    const allowed =
      await isConversationMember(
        userId,
        conversationId
      );

    if (!allowed) {
      socket.emit(
        SOCKET_EVENTS.CONVERSATION_ERROR,
        {
          conversationId,
          message:
            "Conversation unavailable",
        }
      );
    }

    return allowed;
  } catch (error) {
    console.error(error);

    socket.emit(
      SOCKET_EVENTS.CONVERSATION_ERROR,
      {
        conversationId,
        message:
          "Conversation unavailable",
      }
    );

    return false;
  }
}

export function clearUserTyping(
  io: Server,
  conversationId: string,
  userId: string
) {
  const roomTyping =
    typingMap.get(conversationId);

  if (!roomTyping) {
    return;
  }

  const userSockets =
    roomTyping.get(userId);

  if (!userSockets) {
    return;
  }

  userSockets.forEach((socketId) => {
    clearTypingExpiry(
      conversationId,
      userId,
      socketId
    );
  });

  roomTyping.delete(userId);

  if (!roomTyping.size) {
    typingMap.delete(conversationId);
  }

  emitTypingUsers(io, conversationId);
}

export function registerTypingHandlers(
  io: Server,
  socket: Socket
) {
  const userId = socket.data.user.id as string;

  socket.on(
    SOCKET_EVENTS.START_TYPING,
    async (payload: TypingPayload) => {
      if (!canEmitTypingEvent(socket.id)) {
        return;
      }

      const parsedPayload =
        typingPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        return;
      }

      const { conversationId } =
        parsedPayload.data;

      const allowed =
        await canAccessConversation(
          socket,
          userId,
          conversationId
        );

      if (!allowed) {
        return;
      }

      const typingUsers =
        typingMap.get(conversationId) ??
        new Map<string, Set<string>>();
      const userAlreadyTyping =
        typingUsers.has(userId);

      const userSockets =
        typingUsers.get(userId) ??
        new Set<string>();

      userSockets.add(socket.id);
      typingUsers.set(userId, userSockets);
      typingMap.set(conversationId, typingUsers);
      scheduleTypingExpiry(
        io,
        conversationId,
        userId,
        socket.id
      );

      if (!userAlreadyTyping) {
        emitTypingUsers(io, conversationId);
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.STOP_TYPING,
    async (payload: TypingPayload) => {
      const parsedPayload =
        typingPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        return;
      }

      const { conversationId } =
        parsedPayload.data;

      const allowed =
        await canAccessConversation(
          socket,
          userId,
          conversationId
        );

      if (!allowed) {
        return;
      }

      const before =
        getConversationTypingUsers(
          conversationId
        ).join(",");

      removeSocketFromTypingRoom(
        conversationId,
        userId,
        socket.id
      );

      const after =
        getConversationTypingUsers(
          conversationId
        ).join(",");

      if (before !== after) {
        emitTypingUsers(io, conversationId);
      }
    }
  );

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    lastTypingEventBySocket.delete(socket.id);

    const changedRooms =
      removeSocketFromAllTypingRooms(userId, socket.id);

    changedRooms.forEach((conversationId) => {
      emitTypingUsers(io, conversationId);
    });
  });
}
