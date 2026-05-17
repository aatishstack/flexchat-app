import { FastifyInstance } from "fastify";

import {
  desc,
  inArray,
} from "drizzle-orm";

import { db } from "../db/index.js";

import { conversations } from "../db/schema/conversations.js";
import { messages } from "../db/schema/messages.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getConversationMembers,
  getUserConversationIds,
} from "../lib/conversation-access.js";

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
    return "Attachment";
  }

  return "New message";
}

export async function conversationRoutes(app: FastifyInstance) {
  app.get(
    "/conversations",
    {
      preHandler:
        authMiddleware,
    },

    async (request, reply) => {
      try {
        const userId =
          request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            message: "Unauthorized",
          });
        }

        const conversationIds =
          await getUserConversationIds(userId);

        if (!conversationIds.length) {
          return [];
        }

        const data = await db
          .select()
          .from(conversations)
          .where(
            inArray(
              conversations.id,
              conversationIds
            )
          );
        const memberRows =
          await getConversationMembers(
            conversationIds
          );
        const messageRows = await db
          .select()
          .from(messages)
          .where(
            inArray(
              messages.conversationId,
              conversationIds
            )
          )
          .orderBy(
            desc(messages.createdAt)
          );

        const membersByConversation = new Map<string, string[]>();
        const latestMessageByConversation = new Map<string, string>();
        const unreadCountsByConversation = new Map<string, number>();

        memberRows.forEach((member) => {
          const members =
            membersByConversation.get(member.conversationId) ?? [];

          members.push(member.userId);
          membersByConversation.set(member.conversationId, members);
        });

        messageRows.forEach((message) => {
          if (
            !latestMessageByConversation.has(
              message.conversationId
            )
          ) {
            latestMessageByConversation.set(
              message.conversationId,
              getMessagePreview(message)
            );
          }

          if (
            message.senderId !== userId &&
            message.status !== "read"
          ) {
            unreadCountsByConversation.set(
              message.conversationId,
              (unreadCountsByConversation.get(
                message.conversationId
              ) ?? 0) + 1
            );
          }
        });

        return data.map((conversation) => ({
          ...conversation,
          latestMessage:
            latestMessageByConversation.get(
              conversation.id
            ),
          unreadCount:
            unreadCountsByConversation.get(
              conversation.id
            ) ?? 0,
          memberIds:
            membersByConversation.get(conversation.id) ?? [],
        }));
      } catch (error) {
        console.error(error);

        return reply.status(500).send({
          message: "Failed to fetch conversations",
        });
      }
    },
  );
}
