import {
  FastifyInstance,
} from "fastify";

import {
  and,
  desc,
  eq,
  lt,
} from "drizzle-orm";

import { z } from "zod";

import { db } from "../db/index.js";

import { messages } from "../db/schema/messages.js";
import { isConversationMember } from "../lib/conversation-access.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const messageHistoryParamsSchema = z.object({
  conversationId:
    z.string().trim().min(1).max(128),
});

const messageHistoryQuerySchema = z.object({
  limit:
    z.coerce
      .number()
      .int()
      .min(1)
      .max(150)
      .default(120),
  before:
    z.string().datetime().optional(),
});

export async function messageRoutes(
  app: FastifyInstance
) {
  // GET HISTORY
  app.get(
    "/messages/:conversationId",

    {
      preHandler:
        authMiddleware,
    },

    async (
      request,
      reply
    ) => {
      const parsedParams =
        messageHistoryParamsSchema.safeParse(
          request.params
        );
      const parsedQuery =
        messageHistoryQuerySchema.safeParse(
          request.query
        );

      if (
        !parsedParams.success ||
        !parsedQuery.success
      ) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid message history request",
          });
      }

      const { conversationId } =
        parsedParams.data;
      const {
        before,
        limit,
      } = parsedQuery.data;

      const userId =
        request.user?.id;

      if (!userId) {
        return reply
          .status(401)
          .send({
            message:
              "Unauthorized",
          });
      }

      const allowed =
        await isConversationMember(
          userId,
          conversationId
        );

      if (!allowed) {
        return reply
          .status(403)
          .send({
            message:
              "Conversation unavailable",
          });
      }

      const whereClause = before
        ? and(
            eq(
              messages.conversationId,
              conversationId
            ),
            lt(
              messages.createdAt,
              new Date(before)
            )
          )
        : eq(
            messages.conversationId,
            conversationId
          );

      const data =
        await db
          .select()
          .from(messages)
          .where(whereClause)
          .orderBy(
            desc(
              messages.createdAt
            )
          )
          .limit(limit);

      return data.reverse();
    }
  );
}
