import { FastifyInstance } from "fastify";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const conversationListQuerySchema = z.object({
  limit:
    z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .default(200),
  cursor:
    z.string().trim().max(512).optional(),
});

type ConversationCursor = {
  lastActivityAt: Date;
  id: string;
};

type ConversationRow = Record<string, unknown> & {
  id: string;
  name: string | null;
  type: string;
  avatar: string | null;
  createdAt: Date | string;
  latestMessage: string | null;
  unreadCount: number | string | null;
  memberIds: string[] | null;
  lastActivityAt: Date | string;
};

function encodeConversationCursor(row: ConversationRow) {
  return `${encodeURIComponent(
    new Date(row.lastActivityAt).toISOString()
  )}|${encodeURIComponent(row.id)}`;
}

function decodeConversationCursor(
  cursor?: string
): ConversationCursor | null {
  if (!cursor) {
    return null;
  }

  const [
    rawLastActivityAt,
    rawId,
  ] = cursor.split("|");

  if (!rawLastActivityAt || !rawId) {
    return null;
  }

  const lastActivityAt = new Date(
    decodeURIComponent(rawLastActivityAt)
  );
  const id = decodeURIComponent(rawId);

  if (
    Number.isNaN(lastActivityAt.getTime()) ||
    !id.trim()
  ) {
    return null;
  }

  return {
    id,
    lastActivityAt,
  };
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
        const parsedQuery =
          conversationListQuerySchema.safeParse(
            request.query
          );

        if (!parsedQuery.success) {
          return reply.status(400).send({
            message:
              "Invalid conversation list request",
          });
        }

        const userId =
          request.user?.id;

        if (!userId) {
          return reply.status(401).send({
            message: "Unauthorized",
          });
        }

        const cursor =
          decodeConversationCursor(
            parsedQuery.data.cursor
          );

        if (
          parsedQuery.data.cursor &&
          !cursor
        ) {
          return reply.status(400).send({
            message:
              "Invalid conversation cursor",
          });
        }

        const {
          limit,
        } = parsedQuery.data;
        const cursorFilter = cursor
          ? sql`
              where (
                last_activity_at,
                id
              ) < (
                ${cursor.lastActivityAt},
                ${cursor.id}
              )
            `
          : sql``;

        const rows =
          await db.execute<ConversationRow>(sql`
            with user_conversations as (
              select distinct
                c.id,
                c.name,
                c.type,
                c.avatar,
                c.created_at
              from conversations c
              inner join conversation_members current_member
                on current_member.conversation_id = c.id
              where current_member.user_id = ${userId}
            ),
            hydrated_conversations as (
              select
                uc.id,
                uc.name,
                uc.type,
                uc.avatar,
                uc.created_at as "createdAt",
                coalesce(
                  latest.created_at,
                  uc.created_at
                ) as last_activity_at,
                case
                  when nullif(trim(latest.text), '') is not null
                    then latest.text
                  when latest.audio is not null
                    then 'Voice message'
                  when latest.attachment is not null
                    then 'Attachment'
                  else null
                end as "latestMessage",
                coalesce(
                  unread.unread_count,
                  0
                )::int as "unreadCount",
                coalesce(
                  members.member_ids,
                  array[]::text[]
                ) as "memberIds"
              from user_conversations uc
              left join lateral (
                select
                  m.text,
                  m.attachment,
                  m.audio,
                  m.created_at
                from messages m
                where m.conversation_id = uc.id
                order by
                  m.created_at desc,
                  m.id desc
                limit 1
              ) latest on true
              left join lateral (
                select count(*)::int as unread_count
                from messages m
                where m.conversation_id = uc.id
                  and m.sender_id <> ${userId}
                  and m.status <> 'read'
              ) unread on true
              left join lateral (
                select array_agg(
                  cm.user_id
                  order by cm.user_id
                ) as member_ids
                from conversation_members cm
                where cm.conversation_id = uc.id
              ) members on true
            )
            select
              id,
              name,
              type,
              avatar,
              "createdAt",
              last_activity_at as "lastActivityAt",
              "latestMessage",
              "unreadCount",
              "memberIds"
            from hydrated_conversations
            ${cursorFilter}
            order by
              last_activity_at desc,
              id desc
            limit ${limit + 1}
          `);

        const pageRows = rows.slice(0, limit);
        const nextRow = rows[limit];

        if (nextRow) {
          reply.header(
            "x-next-cursor",
            encodeConversationCursor(nextRow)
          );
        }

        return pageRows.map((conversation) => ({
          id: conversation.id,
          name: conversation.name,
          type: conversation.type,
          avatar:
            conversation.avatar ?? undefined,
          createdAt:
            conversation.createdAt,
          latestMessage:
            conversation.latestMessage ?? undefined,
          unreadCount:
            Number(
              conversation.unreadCount ?? 0
            ),
          memberIds:
            conversation.memberIds ?? [],
          lastActivityAt:
            conversation.lastActivityAt,
        }));
      } catch (error) {
        request.log.error(
          {
            err: error,
          },
          "Failed to fetch conversations"
        );

        return reply.status(500).send({
          message: "Failed to fetch conversations",
        });
      }
    },
  );
}
