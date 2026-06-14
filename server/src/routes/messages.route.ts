import {
  FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";

import { and, desc, eq, sql } from "drizzle-orm";

import { z } from "zod";

import { db } from "../db/index.js";

import { messageReactions, messages } from "../db/schema/messages.js";
import {
  getConversationMembers,
  isConversationMember,
} from "../lib/conversation-access.js";
import { generateId } from "../lib/uuid.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { deleteMediaAsset } from "../services/media.service.js";
import { getSocketServer } from "../socket/socket-hub.js";
import { SOCKET_EVENTS } from "../socket/socket-events.js";

const messageHistoryParamsSchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
});

const messageActionParamsSchema = z.object({
  messageId: z.string().trim().min(1).max(128),
});

const editMessageBodySchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
  text: z.string().trim().min(1).max(4000),
});

const deleteMessageBodySchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
  scope: z.enum(["me", "everyone"]).default("everyone"),
});

const reactMessageBodySchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
  emoji: z.string().trim().min(1).max(16),
});

const forwardMessageBodySchema = z.object({
  targetConversationIds: z
    .array(z.string().trim().min(1).max(128))
    .min(1)
    .max(20),
});

const messageHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(150).default(120),
  before: z.string().datetime().optional(),
  cursor: z.string().trim().max(512).optional(),
});

type MessageCursor = {
  createdAt: Date;
  id: string;
};

type MessageCursorRow = {
  id: string;
  createdAt: Date | string;
};

type MessageRow = typeof messages.$inferSelect;

type ReactionRow = {
  messageId: string;
  emoji: string;
  count: number;
};

type ForwardSourceRow = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachment: string | null;
  audio: string | null;
  mediaPublicId: string | null;
  mediaSecureUrl: string | null;
  mediaResourceType: string | null;
  mediaKind: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  mediaBytes: number | null;
  senderName: string;
};

type MessageHistoryRow = MessageRow;

type DeleteTargetRow = {
  id: string;
  conversationId: string;
  senderId: string;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  mediaPublicId: string | null;
  mediaResourceType: string | null;
};

const DELETE_FOR_EVERYONE_WINDOW_MS = 48 * 60 * 60 * 1000;

function encodeMessageCursor(row: MessageCursorRow) {
  return `${encodeURIComponent(
    new Date(row.createdAt).toISOString(),
  )}|${encodeURIComponent(row.id)}`;
}

function decodeMessageCursor(cursor?: string): MessageCursor | null {
  if (!cursor) {
    return null;
  }

  const [rawCreatedAt, rawId] = cursor.split("|");

  if (!rawCreatedAt || !rawId) {
    return null;
  }

  const createdAt = new Date(decodeURIComponent(rawCreatedAt));
  const id = decodeURIComponent(rawId);

  if (Number.isNaN(createdAt.getTime()) || !id.trim()) {
    return null;
  }

  return {
    createdAt,
    id,
  };
}

function toIsoString(value?: Date | string | null) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

async function getReactionMap(messageIds: string[]) {
  const reactionMap = new Map<
    string,
    {
      emoji: string;
      count: number;
    }[]
  >();

  if (!messageIds.length) {
    return reactionMap;
  }

  const rows = await db.execute<ReactionRow>(sql`
    select
      message_id as "messageId",
      emoji,
      count(*)::int as "count"
    from message_reactions
    where message_id in (${sql.join(
      messageIds.map((messageId) => sql`${messageId}`),
      sql`, `,
    )})
    group by message_id, emoji
    order by count(*) desc, emoji asc
  `);

  rows.forEach((row) => {
    const reactions = reactionMap.get(row.messageId) ?? [];

    reactions.push({
      emoji: row.emoji,
      count: Number(row.count),
    });
    reactionMap.set(row.messageId, reactions);
  });

  return reactionMap;
}

function serializeMessage(
  message: MessageRow,
  reactions:
    | {
        emoji: string;
        count: number;
      }[]
    | undefined,
) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    text: message.deletedAt ? "" : message.text,
    attachment: message.deletedAt ? null : (message.attachment ?? null),
    audio: message.deletedAt ? null : (message.audio ?? null),
    type:
      !message.deletedAt && message.mediaKind
        ? message.mediaKind === "document"
          ? "file"
          : message.mediaKind === "audio"
            ? undefined
            : message.mediaKind
        : undefined,
    mediaId: message.deletedAt
      ? null
      : (message.mediaPublicId ?? null),
    fileName: message.deletedAt
      ? null
      : (message.mediaFileName ?? null),
    fileSize: message.deletedAt
      ? null
      : (message.mediaBytes ?? null),
    mimeType: message.deletedAt
      ? null
      : (message.mediaMimeType ?? null),
    mediaResourceType: message.deletedAt
      ? null
      : (message.mediaResourceType ?? null),
    mediaSecureUrl: message.deletedAt
      ? null
      : (message.mediaSecureUrl ?? null),
    status: message.status,
    createdAt: toIsoString(message.createdAt) ?? new Date().toISOString(),
    editedAt: toIsoString(message.editedAt),
    deletedAt: toIsoString(message.deletedAt),
    reactions: message.deletedAt ? [] : (reactions ?? []),
    replyTo:
      message.replyToMessageId && message.replyToText && !message.deletedAt
        ? {
            id: message.replyToMessageId,
            text: message.replyToText,
          }
        : undefined,
    forwardedFrom:
      message.forwardedFromMessageId && !message.deletedAt
        ? {
            messageId: message.forwardedFromMessageId,
            senderId: message.forwardedFromSenderId,
            senderName: message.forwardedFromSenderName ?? "FlexChat User",
          }
        : undefined,
  };
}

function getLatestMessagePreview(message: {
  text?: string | null;
  attachment?: string | null;
  audio?: string | null;
  deletedAt?: string | null;
  forwardedFrom?: unknown;
}) {
  if (message.deletedAt) {
    return "Message deleted";
  }

  const body =
    message.text?.trim() ||
    (message.audio
      ? "Voice message"
      : message.attachment
        ? /\.(png|jpe?g|gif|webp|avif|heic|heif)(\?|$)/i.test(
            message.attachment,
          )
          ? "Photo"
          : /\.(mp4|webm|ogg|mov|m4v|3gp|3gpp|3g2|3gpp2)(\?|$)/i.test(
                message.attachment,
              )
            ? "Video"
            : "File"
        : "New message");

  return message.forwardedFrom ? `Forwarded: ${body}` : body;
}

async function getSerializedMessage(messageId: string) {
  const foundMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  const message = foundMessages[0];

  if (!message) {
    return null;
  }

  const reactionMap = await getReactionMap([message.id]);

  return serializeMessage(message, reactionMap.get(message.id));
}

async function deleteMessageMediaIfUnreferenced(
  publicId?: string | null,
  resourceType?: string | null,
) {
  if (!publicId) {
    return;
  }

  const references = await db.execute<{
    count: number | string;
  }>(sql`
    select count(*)::int as count
    from messages
    where media_public_id = ${publicId}
      and deleted_at is null
  `);

  if (Number(references[0]?.count ?? 0) > 0) {
    return;
  }

  await deleteMediaAsset(publicId, resourceType);
}

async function emitMessageMutation(
  event:
    | typeof SOCKET_EVENTS.MESSAGE_UPDATED
    | typeof SOCKET_EVENTS.MESSAGE_DELETED
    | typeof SOCKET_EVENTS.MESSAGE_REACTION_UPDATED,
  message: NonNullable<Awaited<ReturnType<typeof getSerializedMessage>>>,
) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  const members = await getConversationMembers([message.conversationId]);

  members.forEach((member) => {
    io.to(`user:${member.userId}`).emit(event, message);
  });
}

async function emitLatestConversationIfNeeded(
  message: NonNullable<Awaited<ReturnType<typeof getSerializedMessage>>>,
) {
  const latestMessages = await db
    .select({
      id: messages.id,
    })
    .from(messages)
    .where(eq(messages.conversationId, message.conversationId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(1);

  if (latestMessages[0]?.id !== message.id) {
    return;
  }

  const io = getSocketServer();

  if (!io) {
    return;
  }

  const latestMessage = getLatestMessagePreview(message);
  const members = await getConversationMembers([message.conversationId]);

  members.forEach((member) => {
    io.to(`user:${member.userId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
      conversationId: message.conversationId,
      messageId: message.id,
      latestMessage,
      senderId: message.senderId,
      createdAt: message.createdAt,
    });
  });
}

async function handleMessageReactionRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsedParams = messageActionParamsSchema.safeParse(request.params);
  const parsedBody = reactMessageBodySchema.safeParse(request.body);

  if (!parsedParams.success || !parsedBody.success) {
    return reply.status(400).send({
      message: "Invalid reaction request",
    });
  }

  const userId = (request.user as any)?.id;

  if (!userId) {
    return reply.status(401).send({
      message: "Unauthorized",
    });
  }

  const allowed = await isConversationMember(
    userId,
    parsedBody.data.conversationId,
  );

  if (!allowed) {
    return reply.status(403).send({
      message: "Conversation unavailable",
    });
  }

  const foundMessages = await db
    .select({
      id: messages.id,
      deletedAt: messages.deletedAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.id, parsedParams.data.messageId),
        eq(messages.conversationId, parsedBody.data.conversationId),
      ),
    )
    .limit(1);

  const targetMessage = foundMessages[0];

  if (!targetMessage || targetMessage.deletedAt) {
    return reply.status(404).send({
      message: "Message unavailable",
    });
  }

  const existingReactions = await db
    .select()
    .from(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, targetMessage.id),
        eq(messageReactions.userId, userId),
      ),
    )
    .limit(1);

  const existingReaction = existingReactions[0];

  if (existingReaction?.emoji === parsedBody.data.emoji) {
    await db
      .delete(messageReactions)
      .where(eq(messageReactions.id, existingReaction.id));
  } else if (existingReaction) {
    await db
      .update(messageReactions)
      .set({
        emoji: parsedBody.data.emoji,
      })
      .where(eq(messageReactions.id, existingReaction.id));
  } else {
    await db.insert(messageReactions).values({
      id: generateId(),
      messageId: targetMessage.id,
      conversationId: parsedBody.data.conversationId,
      userId,
      emoji: parsedBody.data.emoji,
    });

    // Notify message sender about reaction
    if (targetMessage.senderId !== userId) {
      void (async () => {
        const reactorName = await getUsername(userId);
        await createNotification({
          userId: targetMessage.senderId,
          actorId: userId,
          type: "message_reaction",
          entityId: targetMessage.id,
          metadata: {
            emoji: parsedBody.data.emoji,
            conversationId: targetMessage.conversationId,
          },
          title: "Message reaction",
          body: `${reactorName} reacted with ${parsedBody.data.emoji} to your message`,
        });
      })();
    }
  }

  const message = await getSerializedMessage(targetMessage.id);

  if (!message) {
    return reply.status(404).send({
      message: "Message unavailable",
    });
  }

  await emitMessageMutation(
    SOCKET_EVENTS.MESSAGE_REACTION_UPDATED,
    message,
  );

  return message;
}

export async function messageRoutes(app: FastifyInstance) {
  // GET HISTORY
  app.get(
    "/messages/:conversationId",

    {
      preHandler: authMiddleware,
    },

    async (request, reply) => {
      const parsedParams = messageHistoryParamsSchema.safeParse(request.params);
      const parsedQuery = messageHistoryQuerySchema.safeParse(request.query);

      if (!parsedParams.success || !parsedQuery.success) {
        return reply.status(400).send({
          message: "Invalid message history request",
        });
      }

      const { conversationId } = parsedParams.data;
      const { before, cursor: rawCursor, limit } = parsedQuery.data;
      const cursor = decodeMessageCursor(rawCursor);

      if (rawCursor && !cursor) {
        return reply.status(400).send({
          message: "Invalid message cursor",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const allowed = await isConversationMember(userId, conversationId);

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const historyBoundary = cursor
        ? sql`
            and (
              m.created_at,
              m.id
            ) < (
              ${cursor.createdAt},
              ${cursor.id}
            )
          `
        : before
          ? sql`and m.created_at < ${new Date(before)}`
          : sql``;

      const data = await db.execute<MessageHistoryRow>(sql`
        select
          m.id,
          m.conversation_id as "conversationId",
          m.sender_id as "senderId",
          m.text,
          m.attachment,
          m.audio,
          m.media_public_id as "mediaPublicId",
          m.media_secure_url as "mediaSecureUrl",
          m.media_resource_type as "mediaResourceType",
          m.media_kind as "mediaKind",
          m.media_mime_type as "mediaMimeType",
          m.media_file_name as "mediaFileName",
          m.media_bytes as "mediaBytes",
          m.forwarded_from_message_id as "forwardedFromMessageId",
          m.forwarded_from_sender_id as "forwardedFromSenderId",
          m.forwarded_from_sender_name as "forwardedFromSenderName",
          m.reply_to_message_id as "replyToMessageId",
          m.reply_to_text as "replyToText",
          m.edited_at as "editedAt",
          m.deleted_at as "deletedAt",
          m.status,
          m.created_at as "createdAt"
        from messages m
        where m.conversation_id = ${conversationId}
          and not exists (
            select 1
            from message_user_hidden muh
            where muh.message_id = m.id
              and muh.user_id = ${userId}
          )
          ${historyBoundary}
        order by
          m.created_at desc,
          m.id desc
        limit ${limit + 1}
      `);

      const pageRows = data.slice(0, limit);
      const nextRow = data[limit];
      const reactionMap = await getReactionMap(
        pageRows.map((message) => message.id),
      );

      if (nextRow && pageRows.length) {
        reply.header(
          "x-next-cursor",
          encodeMessageCursor(pageRows[pageRows.length - 1]),
        );
      }

      return pageRows
        .reverse()
        .map((message) =>
          serializeMessage(message, reactionMap.get(message.id)),
        );
    },
  );

  app.patch(
    "/messages/:messageId",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = messageActionParamsSchema.safeParse(request.params);
      const parsedBody = editMessageBodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid message edit request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const allowed = await isConversationMember(
        userId,
        parsedBody.data.conversationId,
      );

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const updatedMessages = await db.execute<MessageRow>(sql`
          update messages
          set
            text = ${parsedBody.data.text},
            edited_at = now()
          where id = ${parsedParams.data.messageId}
            and conversation_id = ${parsedBody.data.conversationId}
            and sender_id = ${userId}
            and deleted_at is null
            and created_at >= now() - interval '48 hours'
          returning *
        `);

      const updatedMessage = updatedMessages[0];

      if (!updatedMessage) {
        return reply.status(404).send({
          message: "Message unavailable or no longer editable",
        });
      }

      const message = await getSerializedMessage(updatedMessage.id);

      if (!message) {
        return reply.status(404).send({
          message: "Message unavailable",
        });
      }

      await emitMessageMutation(SOCKET_EVENTS.MESSAGE_UPDATED, message);
      await emitLatestConversationIfNeeded(message);

      return message;
    },
  );

  app.delete(
    "/messages/:messageId",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = messageActionParamsSchema.safeParse(request.params);
      const parsedBody = deleteMessageBodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid message delete request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const allowed = await isConversationMember(
        userId,
        parsedBody.data.conversationId,
      );

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const targetRows = await db.execute<DeleteTargetRow>(sql`
        select
          id,
          conversation_id as "conversationId",
          sender_id as "senderId",
          deleted_at as "deletedAt",
          created_at as "createdAt",
          media_public_id as "mediaPublicId",
          media_resource_type as "mediaResourceType"
        from messages
        where id = ${parsedParams.data.messageId}
          and conversation_id = ${parsedBody.data.conversationId}
        limit 1
      `);

      const targetMessage = targetRows[0];

      if (!targetMessage) {
        return reply.status(404).send({
          message: "Message unavailable",
        });
      }

      if (targetMessage.deletedAt) {
        return reply.status(409).send({
          message: "Message already deleted",
        });
      }

      if (parsedBody.data.scope === "me") {
        const hiddenAt = new Date().toISOString();

        await db.execute(sql`
          insert into message_user_hidden (
            id,
            message_id,
            conversation_id,
            user_id,
            hidden_at
          )
          values (
            ${generateId()},
            ${targetMessage.id},
            ${targetMessage.conversationId},
            ${userId},
            ${hiddenAt}
          )
          on conflict (message_id, user_id)
          do update set
            hidden_at = excluded.hidden_at
        `);

        return {
          mode: "me",
          messageId: targetMessage.id,
          conversationId: targetMessage.conversationId,
          hiddenAt,
        };
      }

      if (targetMessage.senderId !== userId) {
        return reply.status(403).send({
          message: "Only your own messages can be deleted for everyone",
        });
      }

      const createdAt =
        targetMessage.createdAt instanceof Date
          ? targetMessage.createdAt
          : new Date(targetMessage.createdAt);

      if (
        Number.isNaN(createdAt.getTime()) ||
        Date.now() - createdAt.getTime() > DELETE_FOR_EVERYONE_WINDOW_MS
      ) {
        return reply.status(403).send({
          message: "This message can no longer be deleted for everyone",
        });
      }

      const deletedMessages = await db.execute<MessageRow>(sql`
        update messages
        set
          text = '',
          attachment = null,
          audio = null,
          media_public_id = null,
          media_secure_url = null,
          media_resource_type = null,
          media_kind = null,
          media_mime_type = null,
          media_file_name = null,
          media_bytes = null,
          deleted_at = now()
        where id = ${targetMessage.id}
          and conversation_id = ${targetMessage.conversationId}
          and sender_id = ${userId}
          and deleted_at is null
        returning *
      `);

      const deletedMessage = deletedMessages[0];

      if (!deletedMessage) {
        return reply.status(409).send({
          message: "Message already deleted",
        });
      }

      await db
        .delete(messageReactions)
        .where(eq(messageReactions.messageId, deletedMessage.id));

      const message = await getSerializedMessage(deletedMessage.id);

      if (!message) {
        return reply.status(404).send({
          message: "Message unavailable",
        });
      }

      await emitMessageMutation(SOCKET_EVENTS.MESSAGE_DELETED, message);
      await emitLatestConversationIfNeeded(message);
      await deleteMessageMediaIfUnreferenced(
        targetMessage.mediaPublicId,
        targetMessage.mediaResourceType,
      ).catch((error) => {
        request.log.error(
          {
            err: error,
            messageId: targetMessage.id,
            publicId: targetMessage.mediaPublicId,
          },
          "Message media deletion queued for retry",
        );
      });

      return {
        mode: "everyone",
        message,
      };
    },
  );

  app.post(
    "/messages/:messageId/forward",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = messageActionParamsSchema.safeParse(request.params);
      const parsedBody = forwardMessageBodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid message forward request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const sourceRows = await db.execute<ForwardSourceRow>(sql`
          select
            m.id,
            m.conversation_id as "conversationId",
            m.sender_id as "senderId",
            m.text,
            m.attachment,
            m.audio,
            m.media_public_id as "mediaPublicId",
            m.media_secure_url as "mediaSecureUrl",
            m.media_resource_type as "mediaResourceType",
            m.media_kind as "mediaKind",
            m.media_mime_type as "mediaMimeType",
            m.media_file_name as "mediaFileName",
            m.media_bytes as "mediaBytes",
            case
              when u.is_deleted then 'Deleted User'
              else u.username
            end as "senderName"
          from messages m
          inner join users u
            on u.id = m.sender_id
          where m.id = ${parsedParams.data.messageId}
            and m.deleted_at is null
          limit 1
        `);

      const sourceMessage = sourceRows[0];

      if (!sourceMessage) {
        return reply.status(404).send({
          message: "Message unavailable",
        });
      }

      const canReadSource = await isConversationMember(
        userId,
        sourceMessage.conversationId,
      );

      if (!canReadSource) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const targetConversationIds = Array.from(
        new Set(parsedBody.data.targetConversationIds),
      );

      const targetRows = await db.execute<{
        conversationId: string;
      }>(sql`
          select conversation_id as "conversationId"
          from conversation_members
          where user_id = ${userId}
            and conversation_id in (${sql.join(
              targetConversationIds.map(
                (conversationId) => sql`${conversationId}`,
              ),
              sql`, `,
            )})
        `);
      const allowedTargetIds = new Set(
        targetRows.map((row) => row.conversationId),
      );

      if (
        targetConversationIds.some(
          (conversationId) => !allowedTargetIds.has(conversationId),
        )
      ) {
        return reply.status(403).send({
          message: "One or more conversations are unavailable",
        });
      }

      const forwardedMessageIds = await db.transaction(async (tx) => {
        const insertedIds: string[] = [];

        for (const targetConversationId of targetConversationIds) {
          const messageId = generateId();

          await tx.execute(sql`
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
                  forwarded_from_message_id,
                  forwarded_from_sender_id,
                  forwarded_from_sender_name
                )
                values (
                  ${messageId},
                  ${targetConversationId},
                  ${userId},
                  ${sourceMessage.text},
                  ${sourceMessage.attachment},
                  ${sourceMessage.audio},
                  ${sourceMessage.mediaPublicId},
                  ${sourceMessage.mediaSecureUrl},
                  ${sourceMessage.mediaResourceType},
                  ${sourceMessage.mediaKind},
                  ${sourceMessage.mediaMimeType},
                  ${sourceMessage.mediaFileName},
                  ${sourceMessage.mediaBytes},
                  'sent',
                  ${sourceMessage.id},
                  ${sourceMessage.senderId},
                  ${sourceMessage.senderName}
                )
              `);

          insertedIds.push(messageId);
        }

        return insertedIds;
      });

      const forwardedMessages = (
        await Promise.all(
          forwardedMessageIds.map((messageId) =>
            getSerializedMessage(messageId),
          ),
        )
      ).filter(
        (
          message,
        ): message is NonNullable<
          Awaited<ReturnType<typeof getSerializedMessage>>
        > => Boolean(message),
      );

      const io = getSocketServer();

      if (io) {
        for (const message of forwardedMessages) {
          io.to(message.conversationId).emit(
            SOCKET_EVENTS.RECEIVE_MESSAGE,
            message,
          );

          await emitLatestConversationIfNeeded(message);
        }
      }

      return reply.status(201).send({
        messages: forwardedMessages,
      });
    },
  );

  app.post(
    "/messages/:messageId/reactions",
    {
      preHandler: authMiddleware,
    },
    handleMessageReactionRequest,
  );

  app.post(
    "/messages/:messageId/react",
    {
      preHandler: authMiddleware,
    },
    handleMessageReactionRequest,
  );
}
