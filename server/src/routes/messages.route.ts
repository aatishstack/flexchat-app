import {
  FastifyInstance,
} from "fastify";

import {
  and,
  desc,
  eq,
  lt,
  or,
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
  cursor:
    z.string().trim().max(512).optional(),
});

type MessageCursor = {
  createdAt: Date;
  id: string;
};

type MessageCursorRow = {
  id: string;
  createdAt: Date | string;
};

function encodeMessageCursor(row: MessageCursorRow) {
  return `${encodeURIComponent(
    new Date(row.createdAt).toISOString()
  )}|${encodeURIComponent(row.id)}`;
}

function decodeMessageCursor(
  cursor?: string
): MessageCursor | null {
  if (!cursor) {
    return null;
  }

  const [
    rawCreatedAt,
    rawId,
  ] = cursor.split("|");

  if (!rawCreatedAt || !rawId) {
    return null;
  }

  const createdAt = new Date(
    decodeURIComponent(rawCreatedAt)
  );
  const id = decodeURIComponent(rawId);

  if (
    Number.isNaN(createdAt.getTime()) ||
    !id.trim()
  ) {
    return null;
  }

  return {
    createdAt,
    id,
  };
}

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
        cursor: rawCursor,
        limit,
      } = parsedQuery.data;
      const cursor =
        decodeMessageCursor(rawCursor);

      if (rawCursor && !cursor) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid message cursor",
          });
      }

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

      const historyBoundary =
        cursor
          ? or(
              lt(
                messages.createdAt,
                cursor.createdAt
              ),
              and(
                eq(
                  messages.createdAt,
                  cursor.createdAt
                ),
                lt(messages.id, cursor.id)
              )
            )
          : before
            ? lt(
                messages.createdAt,
                new Date(before)
              )
            : undefined;

      const whereClause = historyBoundary
        ? and(
            eq(
              messages.conversationId,
              conversationId
            ),
            historyBoundary
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
            ),
            desc(messages.id)
          )
          .limit(limit + 1);

      const pageRows = data.slice(0, limit);
      const nextRow = data[limit];

      if (nextRow && pageRows.length) {
        reply.header(
          "x-next-cursor",
          encodeMessageCursor(
            pageRows[pageRows.length - 1]
          )
        );
      }

      return pageRows.reverse();
    }
  );
}
