import { Server, Socket } from "socket.io";
import { generateId } from "../../lib/uuid.js";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  getConversationMembers,
  isConversationMember,
} from "../../lib/conversation-access.js";
import { debugLog } from "../../lib/debug-log.js";
import {
  claimOwnedMediaAsset,
  releaseClaimedMediaAsset,
} from "../../services/media.service.js";
import { FcmService } from "../../services/fcm.service.js";
import { clearUserTyping } from "./typing.handler.js";
import { getOnlineUserIds } from "../socket-store.js";
import { users } from "../../db/schema/users.js";
import { eq } from "drizzle-orm";
import { SOCKET_EVENTS } from "../socket-events.js";

type ConversationPayload = {
  conversationId?: string;
};

type SendMessagePayload = ConversationPayload & {
  tempId?: string;
  text?: string;
  attachment?: string | null;
  audio?: string | null;
  mediaId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
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
  type?: "image" | "video" | "file";
  mediaId: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  mediaResourceType: string | null;
  mediaSecureUrl: string | null;
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

const sendMessagePayloadSchema = z
  .object({
    conversationId: conversationIdSchema,
    tempId: z.string().max(128).optional(),
    text: z.string().max(4000).optional(),
    attachment: z.string().url().nullable().optional(),
    audio: z.string().url().nullable().optional(),
    mediaId: z.string().trim().min(1).max(512).nullable().optional(),
    fileName: z.string().trim().max(255).nullable().optional(),
    fileSize: z.number().int().min(0).max(50 * 1024 * 1024).nullable().optional(),
    mimeType: z.string().trim().max(128).nullable().optional(),
    replyTo: replyToPayloadSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.attachment && value.audio) {
      context.addIssue({
        code: "custom",
        message: "A message cannot contain two media attachments",
      });
    }

    if ((value.attachment || value.audio) && !value.mediaId) {
      context.addIssue({
        code: "custom",
        path: ["mediaId"],
        message: "Media ownership is required",
      });
    }
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

  if (parsedReplyTo.data.id.startsWith("story:")) {
    const storyId = parsedReplyTo.data.id.slice("story:".length);

    if (!storyId.trim()) {
      return null;
    }

    const storyRows = await db.execute<{
      id: string;
      mediaType: "image" | "video" | "text";
      caption: string | null;
    }>(sql`
      select
        s.id,
        s.media_type as "mediaType",
        s.caption
      from stories s
      inner join conversation_members cm
        on cm.conversation_id = ${conversationId}
        and cm.user_id = s.user_id
      where s.id = ${storyId}
        and s.deleted_at is null
        and s.expires_at > now()
      limit 1
    `);

    const story = storyRows[0];

    if (!story) {
      return null;
    }

    return {
      id: parsedReplyTo.data.id,
      text:
        story.caption?.trim() ||
        (story.mediaType === "video"
          ? "Story: Video"
          : story.mediaType === "image"
            ? "Story: Photo"
            : "Story"),
    };
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
  const claimedAsset = messageData.mediaId
    ? await claimOwnedMediaAsset(
        userId,
        messageData.mediaId,
        ["chat", "voice", "attachment"],
      )
    : undefined;

  try {
    if (
      messageData.audio &&
      claimedAsset?.kind !== "audio"
    ) {
      throw new Error("Voice messages require an audio upload");
    }

    const replyTo = await getReplyTargetPreview(
      messageData.conversationId,
      messageData.replyTo,
    );
    const message = {
      id: generateId(),
      text,
      attachment:
        messageData.attachment && claimedAsset
          ? claimedAsset.deliveryUrl
          : null,
      audio:
        messageData.audio && claimedAsset
          ? claimedAsset.deliveryUrl
          : null,
      type:
        claimedAsset?.kind === "document"
          ? ("file" as const)
          : claimedAsset?.kind === "image" ||
              claimedAsset?.kind === "video"
            ? claimedAsset.kind
            : undefined,
      mediaId: claimedAsset?.publicId ?? null,
      fileName: claimedAsset?.fileName ?? null,
      fileSize: claimedAsset?.bytes ?? null,
      mimeType: claimedAsset?.mimeType ?? null,
      mediaResourceType:
        claimedAsset?.resourceType ?? null,
      mediaSecureUrl:
        claimedAsset?.secureUrl ?? null,
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
        media_public_id,
        media_secure_url,
        media_resource_type,
        media_kind,
        media_mime_type,
        media_file_name,
        media_bytes,
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
        ${message.mediaId},
        ${message.mediaSecureUrl},
        ${message.mediaResourceType},
        ${claimedAsset?.kind ?? null},
        ${message.mimeType},
        ${message.fileName},
        ${message.fileSize},
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
  } catch (error) {
    if (claimedAsset) {
      await releaseClaimedMediaAsset(
        claimedAsset.publicId,
      );
    }

    throw error;
  }
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

async function sendPushToOfflineMembers(
  senderId: string,
  conversationId: string,
  message: SocketMessage
) {
  try {
    const members = await getConversationMembers([conversationId]);
    const onlineUserIds = new Set(getOnlineUserIds());
    
    // Fetch sender info for better notification
    const senderRows = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);
    
    const senderName = senderRows[0]?.username || "Someone";
    
    const targetUserIds = members
      .map(m => m.userId)
      .filter(id => id !== senderId);

    if (targetUserIds.length === 0) return;

    const pushPayload = {
      title: senderName,
      body: message.text || (message.attachment ? "Sent an attachment" : "New message"),
      data: {
        conversationId,
        messageId: message.id,
        type: "new_message"
      }
    };

    await Promise.all(
      targetUserIds.map(userId => FcmService.sendToUser(userId, pushPayload))
    );

  } catch (error) {
    console.error("[FCM] Failed to send offline push notifications:", error);
  }
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
        console.warn("[FlexChat Message] invalid send payload", {
          socketId: socket.id,
          userId,
          transport: socket.conn.transport.name,
        });
        acknowledge({
          ok: false,
          error: "Invalid message payload",
        });

        return;
      }

      const messageData = parsedData.data;

      debugLog("[FlexChat Message] send received", {
        socketId: socket.id,
        userId,
        conversationId: messageData.conversationId,
        tempId: messageData.tempId,
        transport: socket.conn.transport.name,
      });

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
        debugLog("[FlexChat Message] duplicate tempId acknowledged", {
          socketId: socket.id,
          userId,
          conversationId: messageData.conversationId,
          tempId: messageData.tempId,
          messageId: duplicateMessage.id,
        });

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
        console.error("[FlexChat Message] persistence failed", {
          socketId: socket.id,
          userId,
          conversationId: messageData.conversationId,
          tempId: messageData.tempId,
          error,
        });

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
        clearUserTyping(io, messageData.conversationId, userId);

        io.to(messageData.conversationId).emit(
          SOCKET_EVENTS.RECEIVE_MESSAGE,
          socketMessage,
        );

        // Trigger offline push notifications
        void sendPushToOfflineMembers(userId, messageData.conversationId, socketMessage);

        socket
          .to(messageData.conversationId)
          .emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
            messageId: socketMessage.id,
            status: "delivered",
          });
      }

      acknowledgeSentMessage(socket, ack, socketMessage, messageData.tempId);

      debugLog("[FlexChat Message] send acknowledged", {
        socketId: socket.id,
        userId,
        conversationId: messageData.conversationId,
        tempId: messageData.tempId,
        messageId: socketMessage.id,
      });

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
