import { Server, Socket } from "socket.io";
import { generateId } from "../../lib/uuid.js";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  getConversationMembers,
  isConversationMember,
} from "../../lib/conversation-access.js";
import { SOCKET_EVENTS } from "../socket-events.js";

type ConversationPayload = {
  conversationId?: string;
};

type SendMessagePayload = ConversationPayload & {
  tempId?: string;
  text?: string;
  attachment?: string | null;
  audio?: string | null;
  replyTo?: {
    id: string;
    text: string;
  };
};

type SocketMessage = {
  id: string;
  text: string;
  attachment: string | null;
  audio: string | null;
  senderId: string;
  conversationId: string;
  status: "sent";
  createdAt: string;
  tempId?: string;
  replyTo?: {
    id: string;
    text: string;
  };
};

type SendMessageAck = (response: {
  ok: boolean;
  error?: string;
  message?: SocketMessage;
  messageId?: string;
  serverId?: string;
  status?: "sent";
}) => void;

type MessageReceiptPayload = ConversationPayload & {
  messageId?: string;
};

type MessageReceiptsPayload = ConversationPayload & {
  messageIds?: string[];
};

type ConversationUpdatedPayload = {
  conversationId: string;
  messageId: string;
  latestMessage: string;
  senderId: string;
  createdAt: string;
};

const conversationIdSchema = z.string().trim().min(1).max(128);
const messageIdSchema = z.string().trim().min(1).max(128);
const replyToPayloadSchema = z.object({
  id: z.string().max(128),
  text: z.string().max(500),
});

const sendMessagePayloadSchema = z.object({
  conversationId: conversationIdSchema,
  tempId: z.string().max(128).optional(),
  text: z.string().max(4000).optional(),
  attachment: z.string().url().nullable().optional(),
  audio: z.string().url().nullable().optional(),
  replyTo: replyToPayloadSchema.optional(),
});

const receiptPayloadSchema = z.object({
  conversationId: conversationIdSchema,
  messageId: messageIdSchema,
});

const receiptBatchPayloadSchema = z.object({
  conversationId: conversationIdSchema,
  messageIds: z.array(messageIdSchema).min(1).max(100),
});

const MESSAGE_DEDUPE_TTL_MS = 10 * 60 * 1000;

const MAX_RECENT_CLIENT_MESSAGES = 5000;
const MESSAGE_RATE_LIMIT_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 24;

type RecentClientMessage = {
  message: SocketMessage;
  expiresAt: number;
};

const recentClientMessages = new Map<string, RecentClientMessage>();

const inFlightClientMessages = new Map<string, Promise<SocketMessage>>();

const messageRateBySocket = new Map<
  string,
  {
    count: number;
    resetAt: number;
  }
>();

function consumeMessageRate(socketId: string) {
  const now = Date.now();
  const current = messageRateBySocket.get(socketId);

  if (!current || current.resetAt <= now) {
    messageRateBySocket.set(socketId, {
      count: 1,
      resetAt: now + MESSAGE_RATE_LIMIT_WINDOW_MS,
    });

    return true;
  }

  if (current.count >= MAX_MESSAGES_PER_WINDOW) {
    return false;
  }

  current.count += 1;
  return true;
}

function getConversationId(payload: ConversationPayload | string) {
  const rawConversationId =
    typeof payload === "string" ? payload : payload.conversationId;

  const parsedConversationId =
    conversationIdSchema.safeParse(rawConversationId);

  return parsedConversationId.success ? parsedConversationId.data : null;
}

function getDedupeKey(userId: string, conversationId: string, tempId?: string) {
  if (!tempId) {
    return null;
  }

  return `${userId}:${conversationId}:${tempId}`;
}

function pruneRecentClientMessages() {
  const now = Date.now();

  recentClientMessages.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      recentClientMessages.delete(key);
    }
  });

  while (recentClientMessages.size > MAX_RECENT_CLIENT_MESSAGES) {
    const oldestKey = recentClientMessages.keys().next().value;

    if (!oldestKey) {
      return;
    }

    recentClientMessages.delete(oldestKey);
  }
}

function getRecentClientMessage(key: string | null) {
  if (!key) {
    return null;
  }

  pruneRecentClientMessages();

  const entry = recentClientMessages.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    recentClientMessages.delete(key);
    return null;
  }

  return entry.message;
}

function rememberClientMessage(key: string | null, message: SocketMessage) {
  if (!key) {
    return;
  }

  pruneRecentClientMessages();

  recentClientMessages.set(key, {
    message,
    expiresAt: Date.now() + MESSAGE_DEDUPE_TTL_MS,
  });
}

function emitConversationError(
  socket: Socket,
  conversationId: string,
  message = "Conversation unavailable",
) {
  socket.emit(SOCKET_EVENTS.CONVERSATION_ERROR, {
    conversationId,
    message,
  });
}

async function canAccessConversation(
  socket: Socket,
  userId: string,
  conversationId: string,
) {
  try {
    const allowed = await isConversationMember(userId, conversationId);

    if (!allowed) {
      emitConversationError(socket, conversationId);
    }

    return allowed;
  } catch (error) {
    console.error(error);

    emitConversationError(socket, conversationId);

    return false;
  }
}

async function persistMessageStatuses(
  conversationId: string,
  messageIds: string[],
  status: "delivered" | "read",
  actorUserId: string,
) {
  if (!messageIds.length) {
    return;
  }

  await db.execute(sql`
    update messages
    set status = ${status}
    where conversation_id = ${conversationId}
      and sender_id <> ${actorUserId}
      and id in (${sql.join(
        messageIds.map((messageId) => sql`${messageId}`),
        sql`, `,
      )})
  `);
}

async function getReplyTargetPreview(
  conversationId: string,
  replyTo?: z.infer<typeof replyToPayloadSchema>,
) {
  const parsedReplyTo = replyToPayloadSchema.safeParse(replyTo);

  if (!parsedReplyTo.success || !parsedReplyTo.data.id.trim()) {
    return null;
  }

  const replyRows = await db.execute<{
    id: string;
    text: string;
    attachment: string | null;
    audio: string | null;
  }>(sql`
    select
      id,
      text,
      attachment,
      audio
    from messages
    where id = ${parsedReplyTo.data.id}
      and conversation_id = ${conversationId}
      and deleted_at is null
    limit 1
  `);

  const replyMessage = replyRows[0];

  if (!replyMessage) {
    return null;
  }

  return {
    id: replyMessage.id,
    text: getMessagePreview(replyMessage).slice(0, 500),
  };
}

async function persistSocketMessage(
  userId: string,
  messageData: z.infer<typeof sendMessagePayloadSchema>,
  text: string,
) {
  const createdAt = new Date().toISOString();
  const replyTo = await getReplyTargetPreview(
    messageData.conversationId,
    messageData.replyTo,
  );
  const message = {
    id: generateId(),
    text,
    attachment: messageData.attachment ?? null,
    audio: messageData.audio ?? null,
    senderId: userId,
    conversationId: messageData.conversationId,
    status: "sent" as const,
    createdAt,
  };

  await db.execute(sql`
    insert into messages (
      id,
      conversation_id,
      sender_id,
      text,
      attachment,
      audio,
      status,
      created_at,
      reply_to_message_id,
      reply_to_text
    )
    values (
      ${message.id},
      ${message.conversationId},
      ${message.senderId},
      ${message.text},
      ${message.attachment},
      ${message.audio},
      ${message.status},
      ${message.createdAt},
      ${replyTo?.id ?? null},
      ${replyTo?.text ?? null}
    )
  `);

  return {
    ...message,
    createdAt,
    tempId: messageData.tempId,
    replyTo: replyTo ?? undefined,
  } satisfies SocketMessage;
}

function acknowledgeSentMessage(
  socket: Socket,
  ack: SendMessageAck | undefined,
  message: SocketMessage,
  tempId?: string,
) {
  if (typeof ack === "function") {
    ack({
      ok: true,
      message,
      messageId: tempId ?? message.id,
      serverId: message.id,
      status: "sent",
    });
  }

  socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
    messageId: tempId ?? message.id,
    serverId: message.id,
    status: "sent",
  });
}

async function emitConversationUpdated(io: Server, message: SocketMessage) {
  const members = await getConversationMembers([message.conversationId]);

  const payload: ConversationUpdatedPayload = {
    conversationId: message.conversationId,
    messageId: message.id,
    latestMessage: getMessagePreview(message),
    senderId: message.senderId,
    createdAt: message.createdAt,
  };

  members.forEach((member) => {
    io.to(`user:${member.userId}`).emit(
      SOCKET_EVENTS.CONVERSATION_UPDATED,
      payload,
    );
  });
}

function getMessagePreview(message: {
  text?: string;
  attachment?: string | null;
  audio?: string | null;
}) {
  if (message.text?.trim()) {
    return message.text;
  }

  if (message.audio) {
    return "Voice message";
  }

  if (message.attachment) {
    if (/\.(png|jpe?g|gif|webp|avif|heic|heif)(\?|$)/i.test(message.attachment)) {
      return "Photo";
    }

    if (/\.(mp4|webm|ogg|mov|m4v|3gp|3gpp|3g2|3gpp2)(\?|$)/i.test(message.attachment)) {
      return "Video";
    }

    return "File";
  }

  return "New message";
}

export function registerMessageHandlers(io: Server, socket: Socket) {
  const userId = socket.data.user.id as string;

  socket.on(
    SOCKET_EVENTS.JOIN_CONVERSATION,
    async (payload: ConversationPayload | string) => {
      const conversationId = getConversationId(payload);

      if (!conversationId) {
        return;
      }

      const allowed = await canAccessConversation(
        socket,
        userId,
        conversationId,
      );

      if (!allowed) {
        return;
      }

      socket.join(conversationId);
    },
  );

  socket.on(
    SOCKET_EVENTS.LEAVE_CONVERSATION,
    (payload: ConversationPayload | string) => {
      const conversationId = getConversationId(payload);

      if (!conversationId) {
        return;
      }

      socket.leave(conversationId);
    },
  );

  socket.on(
    SOCKET_EVENTS.SEND_MESSAGE,
    async (data: SendMessagePayload, ack?: SendMessageAck) => {
      const acknowledge = (response: Parameters<SendMessageAck>[0]) => {
        if (typeof ack === "function") {
          ack(response);
        }
      };

      if (!consumeMessageRate(socket.id)) {
        acknowledge({
          ok: false,
          error: "You're sending messages too quickly",
        });

        return;
      }

      const parsedData = sendMessagePayloadSchema.safeParse(data);

      if (!parsedData.success) {
        acknowledge({
          ok: false,
          error: "Invalid message payload",
        });

        return;
      }

      const messageData = parsedData.data;

      const allowed = await canAccessConversation(
        socket,
        userId,
        messageData.conversationId,
      );

      if (!allowed) {
        acknowledge({
          ok: false,
          error: "Conversation unavailable",
        });

        return;
      }

      const text = messageData.text?.trim() ?? "";

      if (!text && !messageData.attachment && !messageData.audio) {
        acknowledge({
          ok: false,
          error: "Cannot send an empty message",
        });

        return;
      }

      const dedupeKey = getDedupeKey(
        userId,
        messageData.conversationId,
        messageData.tempId,
      );
      const duplicateMessage = getRecentClientMessage(dedupeKey);

      if (duplicateMessage) {
        acknowledgeSentMessage(
          socket,
          ack,
          duplicateMessage,
          messageData.tempId,
        );

        return;
      }

      const existingFlight = dedupeKey
        ? inFlightClientMessages.get(dedupeKey)
        : null;
      const ownsPersistence = !existingFlight;
      const messagePromise =
        existingFlight ?? persistSocketMessage(userId, messageData, text);

      if (dedupeKey && ownsPersistence) {
        inFlightClientMessages.set(dedupeKey, messagePromise);
      }

      let socketMessage: SocketMessage;

      try {
        socketMessage = await messagePromise;
      } catch (error) {
        console.error(error);

        acknowledge({
          ok: false,
          error: "Message persistence failed",
        });

        return;
      } finally {
        if (
          dedupeKey &&
          inFlightClientMessages.get(dedupeKey) === messagePromise
        ) {
          inFlightClientMessages.delete(dedupeKey);
        }
      }

      rememberClientMessage(dedupeKey, socketMessage);

      if (ownsPersistence) {
        io.to(messageData.conversationId).emit(
          SOCKET_EVENTS.RECEIVE_MESSAGE,
          socketMessage,
        );

        socket
          .to(messageData.conversationId)
          .emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
            messageId: socketMessage.id,
            status: "delivered",
          });
      }

      acknowledgeSentMessage(socket, ack, socketMessage, messageData.tempId);

      if (ownsPersistence) {
        void emitConversationUpdated(io, socketMessage).catch((error) => {
          console.error("Failed to emit conversation update", error);
        });
      }
    },
  );

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    messageRateBySocket.delete(socket.id);
  });

  socket.on(
    SOCKET_EVENTS.MESSAGE_DELIVERED,
    async (payload: MessageReceiptPayload) => {
      const parsedPayload = receiptPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        return;
      }

      const receipt = parsedPayload.data;

      const allowed = await canAccessConversation(
        socket,
        userId,
        receipt.conversationId,
      );

      if (!allowed) {
        return;
      }

      try {
        await persistMessageStatuses(
          receipt.conversationId,
          [receipt.messageId],
          "delivered",
          userId,
        );
      } catch (error) {
        console.error("Failed to persist delivered receipt", error);
      }

      socket.to(receipt.conversationId).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
        messageId: receipt.messageId,
        status: "delivered",
      });
    },
  );

  socket.on(
    SOCKET_EVENTS.MARK_MESSAGE_SEEN,
    async (payload: MessageReceiptPayload) => {
      const parsedPayload = receiptPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        return;
      }

      const receipt = parsedPayload.data;

      const allowed = await canAccessConversation(
        socket,
        userId,
        receipt.conversationId,
      );

      if (!allowed) {
        return;
      }

      try {
        await persistMessageStatuses(
          receipt.conversationId,
          [receipt.messageId],
          "read",
          userId,
        );
      } catch (error) {
        console.error("Failed to persist read receipt", error);
      }

      socket.to(receipt.conversationId).emit(SOCKET_EVENTS.MESSAGE_SEEN, {
        messageId: receipt.messageId,
        status: "read",
      });
    },
  );

  socket.on(
    SOCKET_EVENTS.MARK_MESSAGES_SEEN,
    async (payload: MessageReceiptsPayload) => {
      const parsedPayload = receiptBatchPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        return;
      }

      const receipt = parsedPayload.data;
      const messageIds = Array.from(new Set(receipt.messageIds));

      const allowed = await canAccessConversation(
        socket,
        userId,
        receipt.conversationId,
      );

      if (!allowed) {
        return;
      }

      try {
        await persistMessageStatuses(
          receipt.conversationId,
          messageIds,
          "read",
          userId,
        );
      } catch (error) {
        console.error("Failed to persist read receipts", error);
      }

      messageIds.forEach((messageId) => {
        socket.to(receipt.conversationId).emit(SOCKET_EVENTS.MESSAGE_SEEN, {
          messageId,
          status: "read",
        });
      });
    },
  );
}
