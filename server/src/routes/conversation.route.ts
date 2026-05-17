import { FastifyInstance } from "fastify";

import { db } from "../db/index.js";

import { conversations } from "../db/schema/conversations.js";
import { conversationMembers } from "../db/schema/conversation-members.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

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

        const data = await db.select().from(conversations);
        let memberRows: (typeof conversationMembers.$inferSelect)[] = [];

        try {
          memberRows = await db.select().from(conversationMembers);
        } catch (error) {
          app.log.warn(
            {
              error,
            },
            "Conversation members unavailable"
          );
        }

        const membersByConversation = new Map<string, string[]>();

        memberRows.forEach((member) => {
          const members =
            membersByConversation.get(member.conversationId) ?? [];

          members.push(member.userId);
          membersByConversation.set(member.conversationId, members);
        });

        const userConversationIds = new Set(
          memberRows
            .filter((member) => member.userId === userId)
            .map((member) => member.conversationId)
        );

        const scopedData =
          userConversationIds.size > 0
            ? data.filter((conversation) =>
                userConversationIds.has(conversation.id)
              )
            : data;

        return scopedData.map((conversation) => ({
          ...conversation,
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
