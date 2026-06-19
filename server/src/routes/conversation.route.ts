import { FastifyInstance } from "fastify";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";

import {
  getConversationMembers,
  isConversationMember,
} from "../lib/conversation-access.js";
import { generateId } from "../lib/uuid.js";
import { isBlocked } from "../lib/blocking.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { SOCKET_EVENTS } from "../socket/socket-events.js";
import { getSocketServer } from "../socket/socket-hub.js";

type QueryExecutor = Pick<typeof db, "execute">;

const conversationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
  cursor: z.string().trim().max(512).optional(),
});

const directConversationBodySchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
});

const conversationParamsSchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
});

const archiveConversationBodySchema = z.object({
  archived: z.boolean(),
});

const themeConversationBodySchema = z.object({
  themeId: z.string().trim().min(1).max(80).nullable(),
  scope: z.enum(["me", "both"]),
});

const conversationFolderSchema = z.enum(["work", "friends", "groups"]);

const conversationSettingsBodySchema = z
  .object({
    pinned: z.boolean().optional(),
    muted: z.boolean().optional(),
    folder: conversationFolderSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.pinned !== undefined ||
      value.muted !== undefined ||
      value.folder !== undefined,
    {
      message: "At least one setting is required",
    },
  );

const conversationReadBodySchema = z.object({
  read: z.boolean(),
});

type ConversationCursor = {
  lastActivityAt: Date;
  id: string;
};

type ConversationMember = {
  id: string;
  username: string;
  avatar: string | null;
  lastSeenAt?: string | null;
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
  archivedAt: Date | string | null;
  localThemeId: string | null;
  pinnedAt: Date | string | null;
  mutedAt: Date | string | null;
  folder: string | null;
  sharedThemeId: string | null;
  themeUpdatedAt: Date | string | null;
};

function toIsoString(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

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
    archivedAt: toIsoString(conversation.archivedAt),
    localThemeId: conversation.localThemeId ?? null,
    pinnedAt: toIsoString(conversation.pinnedAt),
    pinned: !!conversation.pinnedAt,
    mutedAt: toIsoString(conversation.mutedAt),
    muted: !!conversation.mutedAt,
    folder: conversation.folder ?? null,
    sharedThemeId: conversation.sharedThemeId ?? null,
    themeUpdatedAt: toIsoString(conversation.themeUpdatedAt),
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
          c.shared_theme_id,
          c.theme_updated_at,
          c.created_at
        from conversations c
        inner join conversation_members current_member
          on current_member.conversation_id = c.id
        left join conversation_user_settings current_settings
          on current_settings.conversation_id = c.id
          and current_settings.user_id = ${userId}
        where current_member.user_id = ${userId}
          and c.id = ${conversationId}
          and current_settings.hidden_at is null
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
          uc.shared_theme_id as "sharedThemeId",
          uc.theme_updated_at as "themeUpdatedAt",
          settings.archived_at as "archivedAt",
          settings.local_theme_id as "localThemeId",
          settings.pinned_at as "pinnedAt",
          settings.muted_at as "mutedAt",
          settings.folder as folder,
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
            when latest.attachment ~* '\\.(png|jpe?g|gif|webp|avif|heic|heif)(\\?|$)'
              then 'Photo'
            when latest.attachment ~* '\\.(mp4|webm|ogg|mov|m4v|3gp|3gpp|3g2|3gpp2)(\\?|$)'
              then 'Video'
            when latest.attachment is not null
              then 'File'
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
                  end,
                'lastSeenAt',
                  case
                    when u.is_deleted then null
                    else u.last_seen_at
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
        left join conversation_user_settings settings
          on settings.conversation_id = uc.id
          and settings.user_id = ${userId}
      )
      select
        id,
        name,
        type,
        avatar,
        "sharedThemeId",
        "themeUpdatedAt",
        "archivedAt",
        "localThemeId",
        "pinnedAt",
        "mutedAt",
        folder,
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
                c.shared_theme_id,
                c.theme_updated_at,
                c.created_at
              from conversations c
              inner join conversation_members current_member
                on current_member.conversation_id = c.id
              left join conversation_user_settings current_settings
                on current_settings.conversation_id = c.id
                and current_settings.user_id = ${userId}
              where current_member.user_id = ${userId}
                and current_settings.hidden_at is null
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
                uc.shared_theme_id as "sharedThemeId",
                uc.theme_updated_at as "themeUpdatedAt",
                settings.archived_at as "archivedAt",
                settings.local_theme_id as "localThemeId",
                settings.pinned_at as "pinnedAt",
                settings.muted_at as "mutedAt",
                settings.folder as folder,
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
                  when latest.attachment ~* '\\.(png|jpe?g|gif|webp|avif|heic|heif)(\\?|$)'
                    then 'Photo'
                  when latest.attachment ~* '\\.(mp4|webm|ogg|mov|m4v|3gp|3gpp|3g2|3gpp2)(\\?|$)'
                    then 'Video'
                  when latest.attachment is not null
                    then 'File'
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
                        end,
                      'lastSeenAt',
                        case
                          when u.is_deleted then null
                          else u.last_seen_at
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
              left join conversation_user_settings settings
                on settings.conversation_id = uc.id
                and settings.user_id = ${userId}
            )
            select
              id,
              name,
              type,
              avatar,
              "sharedThemeId",
              "themeUpdatedAt",
              "archivedAt",
              "localThemeId",
              "pinnedAt",
              "mutedAt",
              folder,
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

  app.patch(
    "/conversations/:conversationId/archive",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = conversationParamsSchema.safeParse(request.params);
      const parsedBody = archiveConversationBodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid archive request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const conversationId = parsedParams.data.conversationId;
      const allowed = await isConversationMember(userId, conversationId);

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const archivedAt = parsedBody.data.archived
        ? new Date().toISOString()
        : null;

      await db.execute(sql`
        insert into conversation_user_settings (
          id,
          conversation_id,
          user_id,
          archived_at,
          updated_at
        )
        values (
          ${generateId()},
          ${conversationId},
          ${userId},
          ${archivedAt},
          now()
        )
        on conflict (conversation_id, user_id)
        do update set
          archived_at = excluded.archived_at,
          updated_at = now()
      `);

      const conversation = await getHydratedConversation(
        db,
        userId,
        conversationId,
      );

      getSocketServer()
        ?.to(`user:${userId}`)
        .emit(SOCKET_EVENTS.CONVERSATION_ARCHIVE_UPDATED, {
          conversationId,
          archivedAt,
        });

      return conversation;
    },
  );

  app.patch(
    "/conversations/:conversationId/settings",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = conversationParamsSchema.safeParse(request.params);
      const parsedBody = conversationSettingsBodySchema.safeParse(
        request.body,
      );

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid conversation settings request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const conversationId = parsedParams.data.conversationId;
      const allowed = await isConversationMember(userId, conversationId);

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const updatedAt = new Date().toISOString();
      const shouldUpdatePinned = parsedBody.data.pinned !== undefined;
      const shouldUpdateMuted = parsedBody.data.muted !== undefined;
      const shouldUpdateFolder = parsedBody.data.folder !== undefined;
      const pinnedAt = parsedBody.data.pinned ? updatedAt : null;
      const mutedAt = parsedBody.data.muted ? updatedAt : null;
      const folder = parsedBody.data.folder ?? null;

      await db.execute(sql`
        insert into conversation_user_settings (
          id,
          conversation_id,
          user_id,
          pinned_at,
          muted_at,
          folder,
          updated_at
        )
        values (
          ${generateId()},
          ${conversationId},
          ${userId},
          ${pinnedAt},
          ${mutedAt},
          ${folder},
          ${updatedAt}
        )
        on conflict (conversation_id, user_id)
        do update set
          pinned_at = case
            when ${shouldUpdatePinned} then excluded.pinned_at
            else conversation_user_settings.pinned_at
          end,
          muted_at = case
            when ${shouldUpdateMuted} then excluded.muted_at
            else conversation_user_settings.muted_at
          end,
          folder = case
            when ${shouldUpdateFolder} then excluded.folder
            else conversation_user_settings.folder
          end,
          updated_at = ${updatedAt}
      `);

      const conversation = await getHydratedConversation(
        db,
        userId,
        conversationId,
      );

      getSocketServer()
        ?.to(`user:${userId}`)
        .emit(SOCKET_EVENTS.CONVERSATION_SETTINGS_UPDATED, {
          conversationId,
          pinnedAt: conversation?.pinnedAt ?? null,
          pinned: !!conversation?.pinned,
          mutedAt: conversation?.mutedAt ?? null,
          muted: !!conversation?.muted,
          folder: conversation?.folder ?? null,
        });

      return conversation;
    },
  );

  app.patch(
    "/conversations/:conversationId/read",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = conversationParamsSchema.safeParse(request.params);
      const parsedBody = conversationReadBodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid conversation read request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const conversationId = parsedParams.data.conversationId;
      const allowed = await isConversationMember(userId, conversationId);

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      if (parsedBody.data.read) {
        await db.execute(sql`
          update messages
          set status = 'read'
          where conversation_id = ${conversationId}
            and sender_id <> ${userId}
            and status <> 'read'
        `);
      } else {
        await db.execute(sql`
          with latest_remote_message as (
            select id
            from messages
            where conversation_id = ${conversationId}
              and sender_id <> ${userId}
              and deleted_at is null
            order by created_at desc, id desc
            limit 1
          )
          update messages
          set status = 'delivered'
          where id in (
            select id
            from latest_remote_message
          )
        `);
      }

      const conversation = await getHydratedConversation(
        db,
        userId,
        conversationId,
      );

      getSocketServer()
        ?.to(`user:${userId}`)
        .emit(SOCKET_EVENTS.CONVERSATION_READ_UPDATED, {
          conversationId,
          unreadCount: conversation?.unreadCount ?? 0,
        });

      return conversation;
    },
  );

  app.delete(
    "/conversations/:conversationId",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = conversationParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: "Invalid delete conversation request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const conversationId = parsedParams.data.conversationId;
      const allowed = await isConversationMember(userId, conversationId);

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const hiddenAt = new Date().toISOString();

      await db.execute(sql`
        insert into conversation_user_settings (
          id,
          conversation_id,
          user_id,
          archived_at,
          hidden_at,
          updated_at
        )
        values (
          ${generateId()},
          ${conversationId},
          ${userId},
          null,
          ${hiddenAt},
          now()
        )
        on conflict (conversation_id, user_id)
        do update set
          archived_at = null,
          hidden_at = excluded.hidden_at,
          updated_at = now()
      `);

      getSocketServer()
        ?.to(`user:${userId}`)
        .emit(SOCKET_EVENTS.CONVERSATION_DELETED, {
          conversationId,
          hiddenAt,
        });

      return {
        ok: true,
        conversationId,
        hiddenAt,
      };
    },
  );

  app.patch(
    "/conversations/:conversationId/theme",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedParams = conversationParamsSchema.safeParse(request.params);
      const parsedBody = themeConversationBodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid theme request",
        });
      }

      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const conversationId = parsedParams.data.conversationId;
      const { scope, themeId } = parsedBody.data;
      const allowed = await isConversationMember(userId, conversationId);

      if (!allowed) {
        return reply.status(403).send({
          message: "Conversation unavailable",
        });
      }

      const updatedAt = new Date().toISOString();

      if (scope === "me") {
        await db.execute(sql`
          insert into conversation_user_settings (
            id,
            conversation_id,
            user_id,
            local_theme_id,
            updated_at
          )
          values (
            ${generateId()},
            ${conversationId},
            ${userId},
            ${themeId},
            ${updatedAt}
          )
          on conflict (conversation_id, user_id)
          do update set
            local_theme_id = excluded.local_theme_id,
            updated_at = ${updatedAt}
        `);

        getSocketServer()
          ?.to(`user:${userId}`)
          .emit(SOCKET_EVENTS.CONVERSATION_THEME_UPDATED, {
            conversationId,
            scope,
            themeId,
            updatedBy: userId,
            updatedAt,
          });
      } else {
        await db.execute(sql`
          update conversations
          set
            shared_theme_id = ${themeId},
            theme_updated_by = ${userId},
            theme_updated_at = ${updatedAt}
          where id = ${conversationId}
        `);

        await db.execute(sql`
          update conversation_user_settings
          set
            local_theme_id = null,
            updated_at = ${updatedAt}
          where conversation_id = ${conversationId}
        `);

        const members = await getConversationMembers([conversationId]);
        const io = getSocketServer();

        members.forEach((member) => {
          io?.to(`user:${member.userId}`).emit(
            SOCKET_EVENTS.CONVERSATION_THEME_UPDATED,
            {
              conversationId,
              scope,
              themeId,
              updatedBy: userId,
              updatedAt,
            },
          );
        });
      }

      const conversation = await getHydratedConversation(
        db,
        userId,
        conversationId,
      );

      return conversation;
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

        const blocked = await isBlocked(userId, targetUserId);
        if (blocked) {
          return reply.status(400).send({
            message: "User unavailable",
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

          const conversationId = existingConversations[0]?.id ?? generateId();

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
                      ${generateId()},
                      ${conversationId},
                      ${userId}
                    ),
                    (
                      ${generateId()},
                      ${conversationId},
                      ${targetUserId}
                    )
                `);
          }

          await tx.execute(sql`
            insert into conversation_user_settings (
              id,
              conversation_id,
              user_id,
              archived_at,
              hidden_at,
              updated_at
            )
            values (
              ${generateId()},
              ${conversationId},
              ${userId},
              null,
              null,
              now()
            )
            on conflict (conversation_id, user_id)
            do update set
              archived_at = null,
              hidden_at = null,
              updated_at = now()
          `);

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
