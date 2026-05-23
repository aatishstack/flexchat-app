import { FastifyInstance } from "fastify";
import fs from "fs/promises";
import path from "path";

import bcrypt from "bcrypt";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";

import { users } from "../db/schema/users.js";

import { env } from "../config/env.js";
import { clearConversationAccessCacheForUser } from "../lib/conversation-access.js";
import { generateId } from "../lib/uuid.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getSocketServer } from "../socket/socket-hub.js";
import { SOCKET_EVENTS } from "../socket/socket-events.js";

const discoverUsersQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

const lookupUsersQuerySchema = z.object({
  ids: z.string().trim().max(4096).optional(),
});

const discoverDismissParamsSchema = z.object({
  userId: z.string().trim().min(1).max(128),
});

const updateMeBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9_ .-]+$/)
    .optional(),
  avatar: z.string().url().max(2048).nullable().optional(),
});

const deleteMeBodySchema = z.object({
  confirmation: z.literal("DELETE"),
});

function publicUser(user: {
  id: string;
  username: string;
  email?: string;
  avatar?: string | null;
  lastSeenAt?: Date | string | null;
  createdAt?: Date | string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    ...(user.email
      ? {
          email: user.email,
        }
      : {}),
    avatar: user.avatar ?? null,
    lastSeenAt:
      user.lastSeenAt instanceof Date
        ? user.lastSeenAt.toISOString()
        : (user.lastSeenAt ?? null),
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : (user.createdAt ?? null),
  };
}

function deletedUsername(userId: string) {
  return `deleted_user_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
}

function deletedEmail(userId: string) {
  return `deleted_${userId.replace(
    /[^a-zA-Z0-9]/g,
    "",
  )}@deleted.flexchat.local`;
}

async function removeUploadedAsset(url?: string | null) {
  if (!url) {
    return;
  }

  try {
    const parsedUrl = new URL(url);
    const publicApiUrl = new URL(env.PUBLIC_API_URL);

    if (parsedUrl.origin !== publicApiUrl.origin) {
      return;
    }

    if (!parsedUrl.pathname.startsWith("/uploads/")) {
      return;
    }

    const filename = path.basename(parsedUrl.pathname);

    if (!filename || filename === "uploads") {
      return;
    }

    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const filepath = path.resolve(uploadsDir, filename);

    if (!filepath.startsWith(`${uploadsDir}${path.sep}`)) {
      return;
    }

    await fs.unlink(filepath).catch(() => undefined);
  } catch {
    return;
  }
}

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/me",

    {
      preHandler: authMiddleware,
    },

    async (request, reply) => {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const foundUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.isDeleted, false)));

      const user = foundUsers[0];

      if (!user) {
        return reply.status(404).send({
          message: "User not found",
        });
      }

      return publicUser(user);
    },
  );

  app.patch(
    "/users/me",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedBody = updateMeBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid profile update request",
        });
      }

      const currentUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.isDeleted, false)));
      const currentUser = currentUsers[0];

      if (!currentUser) {
        return reply.status(404).send({
          message: "User not found",
        });
      }

      if (parsedBody.data.username) {
        const existingUsername = await db
          .select({
            id: users.id,
          })
          .from(users)
          .where(
            and(
              eq(users.username, parsedBody.data.username),
              eq(users.isDeleted, false),
            ),
          );

        if (existingUsername.length && existingUsername[0].id !== userId) {
          return reply.status(409).send({
            message: "Username already taken",
          });
        }
      }

      const nextUsername = parsedBody.data.username ?? currentUser.username;
      const nextAvatar =
        parsedBody.data.avatar !== undefined
          ? parsedBody.data.avatar
          : (currentUser.avatar ?? null);

      if (
        nextUsername === currentUser.username &&
        nextAvatar === (currentUser.avatar ?? null)
      ) {
        return publicUser(currentUser);
      }

      const updatedUsers = await db.execute<{
        id: string;
        username: string;
        email: string;
        avatar: string | null;
      }>(sql`
            update users
            set
              username = ${nextUsername},
              avatar = ${nextAvatar}
            where id = ${userId}
              and is_deleted = false
            returning
              id,
              username,
              email,
              avatar
          `);

      const user = updatedUsers[0];

      if (!user) {
        return reply.status(404).send({
          message: "User not found",
        });
      }

      const serializedUser = publicUser(user);

      getSocketServer()?.emit(SOCKET_EVENTS.USER_UPDATED, {
        user: serializedUser,
      });

      return serializedUser;
    },
  );

  app.delete(
    "/users/me",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedBody = deleteMeBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Type DELETE to confirm account deletion",
        });
      }

      const deletedAt = new Date();
      const deletedAtIso = deletedAt.toISOString();
      const disabledPassword = await bcrypt.hash(
        `deleted:${userId}:${generateId()}`,
        10,
      );

      const deletionResult = await db.transaction(async (tx) => {
        const currentUsers = await tx.execute<{
          id: string;
          avatar: string | null;
          isDeleted: boolean;
        }>(sql`
              select
                id,
                avatar,
                is_deleted as "isDeleted"
              from users
              where id = ${userId}
              for update
            `);

        const currentUser = currentUsers[0];

        if (!currentUser || currentUser.isDeleted) {
          return null;
        }

        const activeStories = await tx.execute<{
          id: string;
          mediaUrl: string;
        }>(sql`
              select
                id,
                media_url as "mediaUrl"
              from stories
              where user_id = ${userId}
                and deleted_at is null
            `);

        await tx.execute(sql`
            update stories
            set deleted_at = ${deletedAtIso}
            where user_id = ${userId}
              and deleted_at is null
          `);

        await tx.execute(sql`
            delete from story_views
            where user_id = ${userId}
          `);

        await tx.execute(sql`
            update users
            set
              username = ${deletedUsername(userId)},
              email = ${deletedEmail(userId)},
              password = ${disabledPassword},
              avatar = null,
              is_deleted = true,
              deleted_at = ${deletedAtIso}
            where id = ${userId}
              and is_deleted = false
          `);

        return {
          avatar: currentUser.avatar,
          stories: activeStories,
        };
      });

      if (!deletionResult) {
        return reply.status(404).send({
          message: "User not found",
        });
      }

      clearConversationAccessCacheForUser(userId);

      const io = getSocketServer();

      if (io) {
        const payload = {
          userId,
          deletedAt: deletedAtIso,
        };

        io.emit(SOCKET_EVENTS.ACCOUNT_DELETED, payload);

        deletionResult.stories.forEach((story) => {
          io.emit(SOCKET_EVENTS.STORY_DELETED, {
            storyId: story.id,
            deletedAt: payload.deletedAt,
          });
        });

        io.in(`user:${userId}`).disconnectSockets(true);
      }

      await Promise.all([
        removeUploadedAsset(deletionResult.avatar),
        ...deletionResult.stories.map((story) =>
          removeUploadedAsset(story.mediaUrl),
        ),
      ]);

      return {
        ok: true,
      };
    },
  );

  app.get(
    "/users/discover",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedQuery = discoverUsersQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          message: "Invalid user discovery request",
        });
      }

      const { q, limit } = parsedQuery.data;
      const normalizedQuery = q?.trim();
      const generatedUserPrefix = ["du", "mmy"].join("");
      const searchFilter = normalizedQuery
        ? sql`and username ilike ${`%${normalizedQuery}%`}`
        : sql``;

      const discoveredUsers = await db.execute<{
        id: string;
        username: string;
        avatar: string | null;
        lastSeenAt: Date | string | null;
      }>(sql`
          select
            id,
            username,
            avatar,
            last_seen_at as "lastSeenAt"
          from users
          where id <> ${userId}
            and is_deleted = false
            and not exists (
              select 1
              from discover_dismissals dd
              where dd.user_id = ${userId}
                and dd.dismissed_user_id = users.id
            )
            and id not like 'phase3b-%'
            and id not ilike 'demo-%'
            and id not ilike ${`${generatedUserPrefix}-%`}
            and id not ilike 'fake-%'
            and username not ilike 'phase3b_%'
            and username not ilike 'demo_%'
            and username not ilike ${`${generatedUserPrefix}_%`}
            and username not ilike 'fake_%'
            and email not ilike '%@flexchat.local'
            and email not ilike '%@example.com'
            and email not ilike '%@test.com'
          ${searchFilter}
          order by
            username asc,
            id asc
          limit ${limit}
        `);

      return discoveredUsers.map(publicUser);
    },
  );

  app.delete(
    "/users/discover/:userId",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const currentUserId = (request.user as any)?.id;

      if (!currentUserId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedParams = discoverDismissParamsSchema.safeParse(
        request.params,
      );

      if (!parsedParams.success || parsedParams.data.userId === currentUserId) {
        return reply.status(400).send({
          message: "Invalid discover removal request",
        });
      }

      const targetUsers = await db.execute<{
        id: string;
      }>(sql`
        select id
        from users
        where id = ${parsedParams.data.userId}
          and is_deleted = false
        limit 1
      `);

      if (!targetUsers.length) {
        return reply.status(404).send({
          message: "User unavailable",
        });
      }

      await db.execute(sql`
        insert into discover_dismissals (
          id,
          user_id,
          dismissed_user_id
        )
        values (
          ${generateId()},
          ${currentUserId},
          ${parsedParams.data.userId}
        )
        on conflict (user_id, dismissed_user_id)
        do nothing
      `);

      getSocketServer()
        ?.to(`user:${currentUserId}`)
        .emit(SOCKET_EVENTS.DISCOVER_USER_DISMISSED, {
          userId: parsedParams.data.userId,
        });

      return {
        ok: true,
      };
    },
  );

  app.get(
    "/users/lookup",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedQuery = lookupUsersQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          message: "Invalid user lookup request",
        });
      }

      const ids = Array.from(
        new Set(
          parsedQuery.data.ids
            ?.split(",")
            .map((id) => id.trim())
            .filter(Boolean) ?? [],
        ),
      ).slice(0, 100);

      if (!ids.length) {
        return [];
      }

      const foundUsers = await db
        .select({
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          lastSeenAt: users.lastSeenAt,
        })
        .from(users)
        .where(and(inArray(users.id, ids), eq(users.isDeleted, false)));

      return foundUsers.map(publicUser);
    },
  );
}
