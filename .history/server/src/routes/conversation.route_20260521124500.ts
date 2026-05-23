import { FastifyInstance } from "fastify";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

type QueryExecutor = Pick<typeof db, "execute">;

const conversationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
  cursor: z.string().trim().max(512).optional(),
});

const directConversationBodySchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
});

type ConversationCursor = {
  lastActivityAt: Date;
  id: string;
};

type ConversationMember = {
  id: string;
  username: string;
  avatar: string | null;
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
  members: ConversationMember[] | null;
  lastActivityAt: Date | string;
};

function serializeConversation(conversation: ConversationRow) {
  return {
    id: conversation.id,
    name: conversation.name,
    type: conversation.type,
    avatar: conversation.avatar ?? undefined,
    createdAt: conversation.createdAt,
    latestMessage: conversation.latestMessage ?? undefined,
    unreadCount: Number(conversation.unreadCount ?? 0),
    memberIds: conversation.memberIds ?? [],
    members: conversation.members ?? [],
    lastActivityAt: conversation.lastActivityAt,
  };
}

async function getHydratedConversation(
  executor: QueryExecutor,
  userId: string,
  conversationId: string,
) {
  const rows = await executor.execute<ConversationRow>(sql`
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
          and c.id = ${conversationId}
      ),
      hydrated_conversations as (
        select
          uc.id,
          case
            when uc.type = 'direct'
              then coalesce(uc.name, member_data.direct_name)
            else uc.name
          end as name,
          uc.type,
          case
            when uc.type = 'direct'
              then coalesce(member_data.direct_avatar, uc.avatar)
            else uc.avatar
          end as avatar,
          uc.created_at as "createdAt",
          coalesce(
            latest.created_at,
            uc.created_at
          ) as last_activity_at,
          case
            when latest.deleted_at is not null
              then 'Message deleted'
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
            member_data.member_ids,
            array[]::text[]
          ) as "memberIds",
          coalesce(
            member_data.members,
            '[]'::jsonb
          ) as members
        from user_conversations uc
        left join lateral (
          select
            m.text,
            m.attachment,
            m.audio,
            m.created_at,
            m.deleted_at
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
          select
            array_agg(
              cm.user_id
              order by cm.user_id
            ) as member_ids,
            jsonb_agg(
              jsonb_build_object(
                'id', u.id,
                'username',
                  case
                    when u.is_deleted then 'Deleted User'
                    else u.username
                  end,
                'avatar',
                  case
                    when u.is_deleted then null
                    else u.avatar
                  end
              )
              order by
                case
                  when u.is_deleted then 'Deleted User'
                  else u.username
                end,
                u.id
            ) as members,
            max(
              case
                when u.is_deleted then 'Deleted User'
                else u.username
              end
            ) filter (
              where cm.user_id <> ${userId}
            ) as direct_name,
            max(
              case
                when u.is_deleted then null
                else u.avatar
              end
            ) filter (
              where cm.user_id <> ${userId}
            ) as direct_avatar
          from conversation_members cm
          inner join users u
            on u.id = cm.user_id
          where cm.conversation_id = uc.id
        ) member_data on true
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
        "memberIds",
        members
      from hydrated_conversations
      limit 1
    `);

  return rows[0] ? serializeConversation(rows[0]) : null;
}

function encodeConversationCursor(row: ConversationRow) {
  return `${encodeURIComponent(
    new Date(row.lastActivityAt).toISOString(),
  )}|${encodeURIComponent(row.id)}`;
}

function decodeConversationCursor(cursor?: string): ConversationCursor | null {
  if (!cursor) {
    return null;
  }

  const [rawLastActivityAt, rawId] = cursor.split("|");

  if (!rawLastActivityAt || !rawId) {
    return null;
  }

  const lastActivityAt = new Date(decodeURIComponent(rawLastActivityAt));
  const id = decodeURIComponent(rawId);

  if (Number.isNaN(lastActivityAt.getTime()) || !id.trim()) {
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
      preHandler: authMiddleware,
    },

    async (request, reply) => {
      try {
        const parsedQuery = conversationListQuerySchema.safeParse(
          request.query,
        );

        if (!parsedQuery.success) {
          return reply.status(400).send({
            message: "Invalid conversation list request",
          });
        }

        const userId = (request.user as any)?.id;

        if (!userId) {
          return reply.status(401).send({
            message: "Unauthorized",
          });
        }

        const cursor = decodeConversationCursor(parsedQuery.data.cursor);

        if (parsedQuery.data.cursor && !cursor) {
          return reply.status(400).send({
            message: "Invalid conversation cursor",
          });
        }

        const { limit } = parsedQuery.data;
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

        const rows = await db.execute<ConversationRow>(sql`
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
                case
                  when uc.type = 'direct'
                    then coalesce(uc.name, members.direct_name)
                  else uc.name
                end as name,
                uc.type,
                case
                  when uc.type = 'direct'
                    then coalesce(members.direct_avatar, uc.avatar)
                  else uc.avatar
                end as avatar,
                uc.created_at as "createdAt",
                coalesce(
                  latest.created_at,
                  uc.created_at
                ) as last_activity_at,
                case
                  when latest.deleted_at is not null
                    then 'Message deleted'
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
                ) as "memberIds",
                coalesce(
                  members.members,
                  '[]'::jsonb
                ) as members
              from user_conversations uc
              left join lateral (
                select
                  m.text,
                  m.attachment,
                  m.audio,
                  m.created_at,
                  m.deleted_at
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
                select
                  array_agg(
                    cm.user_id
                    order by cm.user_id
                  ) as member_ids,
                  jsonb_agg(
                    jsonb_build_object(
                      'id', u.id,
                      'username',
                        case
                          when u.is_deleted then 'Deleted User'
                          else u.username
                        end,
                      'avatar',
                        case
                          when u.is_deleted then null
                          else u.avatar
                        end
                    )
                    order by
                      case
                        when u.is_deleted then 'Deleted User'
                        else u.username
                      end,
                      u.id
                  ) as members,
                  max(
                    case
                      when u.is_deleted then 'Deleted User'
                      else u.username
                    end
                  ) filter (
                    where cm.user_id <> ${userId}
                  ) as direct_name,
                  max(
                    case
                      when u.is_deleted then null
                      else u.avatar
                    end
                  ) filter (
                    where cm.user_id <> ${userId}
                  ) as direct_avatar
                from conversation_members cm
                inner join users u
                  on u.id = cm.user_id
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
              "memberIds",
              members
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
            encodeConversationCursor(pageRows[pageRows.length - 1]),
          );
        }

        return pageRows.map(serializeConversation);
      } catch (error) {
        request.log.error(
          {
            err: error,
          },
          "Failed to fetch conversations",
        );

        return reply.status(500).send({
          message: "Failed to fetch conversations",
        });
      }
    },
  );

  app.post(
    "/conversations/direct",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      try {
        const parsedBody = directConversationBodySchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.status(400).send({
            message: "Invalid direct conversation request",
          });
        }

        const userId = (request.user as any)?.id;

        if (!userId) {
          return reply.status(401).send({
            message: "Unauthorized",
          });
        }

        const { targetUserId } = parsedBody.data;

        if (targetUserId === userId) {
          return reply.status(400).send({
            message: "Cannot start a direct conversation with yourself",
          });
        }

        const targetUsers = await db.execute<{
          id: string;
        }>(sql`
            select id
            from users
            where id = ${targetUserId}
              and is_deleted = false
            limit 1
          `);

        if (!targetUsers.length) {
          return reply.status(404).send({
            message: "User not found",
          });
        }

        const participantKey = [userId, targetUserId].sort().join(":");

        const conversation = await db.transaction(async (tx) => {
          await tx.execute(sql`
                select pg_advisory_xact_lock(
                  hashtext(${participantKey})
                )
              `);

          const existingConversations = await tx.execute<{
            id: string;
          }>(sql`
                  select c.id
                  from conversations c
                  where c.type = 'direct'
                    and exists (
                      select 1
                      from conversation_members cm
                      where cm.conversation_id = c.id
                        and cm.user_id = ${userId}
                    )
                    and exists (
                      select 1
                      from conversation_members cm
                      where cm.conversation_id = c.id
                        and cm.user_id = ${targetUserId}
                    )
                    and (
                      select count(*)
                      from conversation_members cm
                      where cm.conversation_id = c.id
                    ) = 2
                  limit 1
                `);

          const conversationId =
            existingConversations[0]?.id ?? crypto.randomUUID();

          if (!existingConversations.length) {
            await tx.execute(sql`
                  insert into conversations (
                    id,
                    type
                  )
                  values (
                    ${conversationId},
                    'direct'
                  )
                `);

            await tx.execute(sql`
                  insert into conversation_members (
                    id,
                    conversation_id,
                    user_id
                  )
                  values
                    (
                      ${crypto.randomUUID()},
                      ${conversationId},
                      ${userId}
                    ),
                    (
                      ${crypto.randomUUID()},
                      ${conversationId},
                      ${targetUserId}
                    )
                `);
          }

          return getHydratedConversation(tx, userId, conversationId);
        });

        if (!conversation) {
          return reply.status(500).send({
            message: "Failed to create conversation",
          });
        }

        return conversation;
      } catch (error) {
        request.log.error(
          {
            err: error,
          },
          "Failed to create direct conversation",
        );

        return reply.status(500).send({
          message: "Failed to create direct conversation",
        });
      }
    },
  );
}
