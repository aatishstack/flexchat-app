import type { FastifyInstance } from "fastify";
import { generateId } from "../lib/uuid.js";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { SOCKET_EVENTS } from "../socket/socket-events.js";
import { getSocketServer } from "../socket/socket-hub.js";

const storyBodySchema = z.object({
  mediaUrl: z.string().url().max(2048),
  mediaType: z.enum(["image", "video"]),
  caption: z.string().trim().max(220).optional(),
});

const storyParamsSchema = z.object({
  storyId: z.string().trim().min(1).max(128),
});

type StoryRow = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  viewed: boolean | null;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
};

function serializeStory(story: StoryRow) {
  return {
    id: story.id,
    userId: story.userId,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    caption: story.caption ?? "",
    createdAt:
      story.createdAt instanceof Date
        ? story.createdAt.toISOString()
        : story.createdAt,
    expiresAt:
      story.expiresAt instanceof Date
        ? story.expiresAt.toISOString()
        : story.expiresAt,
    viewed: Boolean(story.viewed),
    user: story.user,
  };
}

async function getVisibleStoryUserIds(userId: string) {
  const rows = await db.execute<{
    userId: string;
  }>(sql`
    select distinct cm2.user_id as "userId"
    from conversation_members cm1
    inner join conversation_members cm2
      on cm2.conversation_id = cm1.conversation_id
    inner join users visible_user
      on visible_user.id = cm2.user_id
      and visible_user.is_deleted = false
    where cm1.user_id = ${userId}
    union
    select ${userId} as "userId"
  `);

  return rows.map((row) => row.userId);
}

async function getStoryById(storyId: string, viewerId: string) {
  const rows = await db.execute<StoryRow>(sql`
    with visible_users as (
      select distinct cm2.user_id
      from conversation_members cm1
      inner join conversation_members cm2
        on cm2.conversation_id = cm1.conversation_id
      where cm1.user_id = ${viewerId}
      union
      select ${viewerId}
    )
    select
      s.id,
      s.user_id as "userId",
      s.media_url as "mediaUrl",
      s.media_type as "mediaType",
      s.caption,
      s.created_at as "createdAt",
      s.expires_at as "expiresAt",
      (sv.id is not null) as viewed,
      jsonb_build_object(
        'id', u.id,
        'username', u.username,
        'avatar', u.avatar
      ) as "user"
    from stories s
    inner join users u
      on u.id = s.user_id
      and u.is_deleted = false
    left join story_views sv
      on sv.story_id = s.id
      and sv.user_id = ${viewerId}
    where s.id = ${storyId}
      and s.user_id in (
        select user_id from visible_users
      )
      and s.deleted_at is null
      and s.expires_at > now()
    limit 1
  `);

  return rows[0] ?? null;
}

export async function storyRoutes(app: FastifyInstance) {
  app.get(
    "/stories",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      try {
        const userId = (request.user as any)?.id;

        if (!userId) {
          return reply.status(401).send({
            message: "Unauthorized",
          });
        }

        const stories = await db.execute<StoryRow>(sql`
          with visible_users as (
            select distinct cm2.user_id
            from conversation_members cm1
            inner join conversation_members cm2
              on cm2.conversation_id = cm1.conversation_id
            where cm1.user_id = ${userId}
            union
            select ${userId}
          )
          select
            s.id,
            s.user_id as "userId",
            s.media_url as "mediaUrl",
            s.media_type as "mediaType",
            s.caption,
            s.created_at as "createdAt",
            s.expires_at as "expiresAt",
            (sv.id is not null) as viewed,
            jsonb_build_object(
              'id', u.id,
              'username', u.username,
              'avatar', u.avatar
            ) as "user"
          from stories s
          inner join users u
            on u.id = s.user_id
            and u.is_deleted = false
          left join story_views sv
            on sv.story_id = s.id
            and sv.user_id = ${userId}
          where s.user_id in (
            select user_id from visible_users
          )
            and s.deleted_at is null
            and s.expires_at > now()
          order by s.created_at desc
          limit 200
        `);

        return stories.map(serializeStory);
      } catch (error) {
        request.log.warn(
          {
            err: error,
          },
          "Stories temporarily unavailable",
        );
        reply.header("x-flexchat-stories-error", "unavailable");
        return [];
      }
    },
  );

  app.post(
    "/stories",
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

      const parsedBody = storyBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid story upload request",
        });
      }

      const storyId = generateId();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.execute(sql`
        insert into stories (
          id,
          user_id,
          media_url,
          media_type,
          caption,
          expires_at
        )
        values (
          ${storyId},
          ${userId},
          ${parsedBody.data.mediaUrl},
          ${parsedBody.data.mediaType},
          ${parsedBody.data.caption ?? null},
          ${expiresAt}
        )
      `);

      const story = await getStoryById(storyId, userId);

      if (!story) {
        return reply.status(500).send({
          message: "Failed to publish story",
        });
      }

      const serializedStory = serializeStory(story);
      const io = getSocketServer();

      if (io) {
        const audienceUserIds = await getVisibleStoryUserIds(userId);

        audienceUserIds.forEach((audienceUserId) => {
          io.to(`user:${audienceUserId}`).emit(
            SOCKET_EVENTS.STORY_CREATED,
            serializedStory,
          );
        });
      }

      return reply.status(201).send(serializedStory);
    },
  );

  app.post(
    "/stories/:storyId/view",
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

      const parsedParams = storyParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: "Invalid story view request",
        });
      }

      const story = await getStoryById(parsedParams.data.storyId, userId);

      if (!story) {
        return reply.status(404).send({
          message: "Story unavailable",
        });
      }

      await db.execute(sql`
        insert into story_views (
          id,
          story_id,
          user_id
        )
        values (
          ${generateId()},
          ${story.id},
          ${userId}
        )
        on conflict (story_id, user_id)
        do nothing
      `);

      getSocketServer()
        ?.to(`user:${story.userId}`)
        .emit(SOCKET_EVENTS.STORY_VIEWED, {
          storyId: story.id,
          viewerId: userId,
          viewedAt: new Date().toISOString(),
        });

      return {
        ok: true,
      };
    },
  );

  app.delete(
    "/stories/:storyId",
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

      const parsedParams = storyParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: "Invalid story delete request",
        });
      }

      await db.execute(sql`
        update stories
        set deleted_at = now()
        where id = ${parsedParams.data.storyId}
          and user_id = ${userId}
          and deleted_at is null
      `);

      const io = getSocketServer();

      if (io) {
        const audienceUserIds = await getVisibleStoryUserIds(userId);

        audienceUserIds.forEach((audienceUserId) => {
          io.to(`user:${audienceUserId}`).emit(SOCKET_EVENTS.STORY_DELETED, {
            storyId: parsedParams.data.storyId,
            deletedAt: new Date().toISOString(),
          });
        });
      }

      return {
        ok: true,
      };
    },
  );
}
