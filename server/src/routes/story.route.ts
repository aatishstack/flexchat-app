import type {
  FastifyInstance,
  FastifyRequest,
} from "fastify";
import { generateId } from "../lib/uuid.js";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  claimOwnedMediaAsset,
  deleteMediaAsset,
  MediaServiceError,
  releaseClaimedMediaAsset,
  uploadRequestMedia,
} from "../services/media.service.js";
import { SOCKET_EVENTS } from "../socket/socket-events.js";
import { getSocketServer } from "../socket/socket-hub.js";

const TEXT_STORY_MEDIA_URL = "flexchat://story/text";
const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const storyVisibilitySchema = z.enum(["contacts", "only_me"]);

const storyBodySchema = z
  .object({
    mediaUrl: z.string().trim().max(2048),
    mediaPublicId: z.string().trim().min(1).max(512).optional(),
    mediaType: z.enum(["image", "video", "text"]),
    visibility: storyVisibilitySchema.default("contacts"),
    caption: z.string().trim().max(220).optional(),
  })
  .superRefine((value, context) => {
    if (value.mediaType === "text" && !value.caption?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["caption"],
        message: "Text stories need story text",
      });
    }

    if (value.mediaType === "text") {
      if (value.mediaUrl !== TEXT_STORY_MEDIA_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mediaUrl"],
          message: "Invalid text story media URL",
        });
      }

      return;
    }

    if (!value.mediaPublicId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaPublicId"],
        message: "Story media ownership is required",
      });
    }

    try {
      const mediaUrl = new URL(value.mediaUrl);

      if (!["http:", "https:"].includes(mediaUrl.protocol)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mediaUrl"],
          message: "Story media URL must use HTTP or HTTPS",
        });
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrl"],
        message: "Invalid story media URL",
      });
    }
  });

const storyParamsSchema = z.object({
  storyId: z.string().trim().min(1).max(128),
});

const userStoriesParamsSchema = z.object({
  userId: z.string().trim().min(1).max(128),
});

const storyPrivacyBodySchema = z.object({
  visibility: storyVisibilitySchema,
});

type StoryVisibility = z.infer<typeof storyVisibilitySchema>;

type StoryRow = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "text";
  visibility: StoryVisibility;
  durationSeconds: number | string | null;
  caption: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  viewed: boolean | null;
  viewCount: number | string | null;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
};

type StoryViewerRow = {
  id: string;
  username: string;
  avatar: string | null;
  viewedAt: Date | string;
};

function serializeTimestamp(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalizedValue = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const timestamp = new Date(normalizedValue);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toISOString();
}

function serializeStory(story: StoryRow) {
  return {
    id: story.id,
    userId: story.userId,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    visibility: story.visibility,
    durationSeconds: Number(
      story.durationSeconds ??
        (story.mediaType === "video" ? 30 : 5),
    ),
    caption: story.caption ?? "",
    createdAt: serializeTimestamp(story.createdAt),
    expiresAt: serializeTimestamp(story.expiresAt),
    viewed: Boolean(story.viewed),
    viewCount: Number(story.viewCount ?? 0),
    user: story.user,
  };
}

function getAuthenticatedUserId(request: FastifyRequest) {
  const user = request.user;

  if (
    user &&
    typeof user === "object" &&
    "id" in user &&
    typeof user.id === "string"
  ) {
    return user.id;
  }

  return null;
}

function serializeStoryViewer(viewer: StoryViewerRow) {
  return {
    id: viewer.id,
    username: viewer.username,
    avatar: viewer.avatar,
    viewedAt: serializeTimestamp(viewer.viewedAt),
  };
}

async function getVisibleStoryUserIds(
  userId: string,
  visibility: StoryVisibility,
) {
  if (visibility === "only_me") {
    return [userId];
  }

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
      coalesce(s.visibility, 'contacts') as visibility,
      case
        when s.media_type = 'video' then 30
        else 5
      end as "durationSeconds",
      s.caption,
      s.created_at as "createdAt",
      s.expires_at as "expiresAt",
      (s.user_id = ${viewerId} or sv.id is not null) as viewed,
      (
        select count(*)::int
        from story_views viewer_count
        where viewer_count.story_id = s.id
          and viewer_count.user_id <> s.user_id
      ) as "viewCount",
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
      and (
        s.user_id = ${viewerId}
        or (
          coalesce(s.visibility, 'contacts') = 'contacts'
          and s.user_id in (
            select user_id from visible_users
          )
        )
      )
      and s.deleted_at is null
      and s.expires_at > now()
    limit 1
  `);

  return rows[0] ?? null;
}

async function createStoryRecord(input: {
  userId: string;
  mediaUrl: string;
  mediaPublicId?: string | null;
  mediaSecureUrl?: string | null;
  mediaResourceType?: string | null;
  mediaType: "image" | "video" | "text";
  visibility: StoryVisibility;
  caption?: string;
}) {
  const storyId = generateId();
  const expiresAt = new Date(
    Date.now() + STORY_LIFETIME_MS,
  ).toISOString();

  await db.execute(sql`
    insert into stories (
      id,
      user_id,
      media_url,
      media_public_id,
      media_secure_url,
      media_resource_type,
      media_type,
      visibility,
      caption,
      expires_at
    )
    values (
      ${storyId},
      ${input.userId},
      ${input.mediaUrl},
      ${input.mediaPublicId ?? null},
      ${input.mediaSecureUrl ?? null},
      ${input.mediaResourceType ?? null},
      ${input.mediaType},
      ${input.visibility},
      ${input.caption ?? null},
      ${expiresAt}
    )
  `);

  return getStoryById(storyId, input.userId);
}

async function emitStoryCreated(story: ReturnType<typeof serializeStory>) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  const audienceUserIds = await getVisibleStoryUserIds(
    story.userId,
    story.visibility,
  );

  audienceUserIds.forEach((audienceUserId) => {
    io.to(`user:${audienceUserId}`).emit(
      SOCKET_EVENTS.STORY_CREATED,
      story,
    );
    io.to(`user:${audienceUserId}`).emit(
      SOCKET_EVENTS.STORY_NEW,
      story,
    );
  });
}

export async function storyRoutes(app: FastifyInstance) {
  app.get(
    "/stories",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      try {
        const userId = getAuthenticatedUserId(request);

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
            coalesce(s.visibility, 'contacts') as visibility,
            case
              when s.media_type = 'video' then 30
              else 5
            end as "durationSeconds",
            s.caption,
            s.created_at as "createdAt",
            s.expires_at as "expiresAt",
            (s.user_id = ${userId} or sv.id is not null) as viewed,
            (
              select count(*)::int
              from story_views viewer_count
              where viewer_count.story_id = s.id
                and viewer_count.user_id <> s.user_id
            ) as "viewCount",
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
          where (
            s.user_id = ${userId}
            or (
              coalesce(s.visibility, 'contacts') = 'contacts'
              and s.user_id in (
                select user_id from visible_users
              )
            )
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
        return reply.status(503).send({
          message: "Stories temporarily unavailable",
        });
      }
    },
  );

  app.get(
    "/stories/:userId",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const viewerId = getAuthenticatedUserId(request);

      if (!viewerId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedParams = userStoriesParamsSchema.safeParse(
        request.params,
      );

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: "Invalid story user request",
        });
      }

      const stories = await db.execute<StoryRow>(sql`
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
          coalesce(s.visibility, 'contacts') as visibility,
          case
            when s.media_type = 'video' then 30
            else 5
          end as "durationSeconds",
          s.caption,
          s.created_at as "createdAt",
          s.expires_at as "expiresAt",
          (s.user_id = ${viewerId} or sv.id is not null) as viewed,
          (
            select count(*)::int
            from story_views viewer_count
            where viewer_count.story_id = s.id
              and viewer_count.user_id <> s.user_id
          ) as "viewCount",
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
        where s.user_id = ${parsedParams.data.userId}
          and (
            s.user_id = ${viewerId}
            or (
              coalesce(s.visibility, 'contacts') = 'contacts'
              and s.user_id in (
                select user_id from visible_users
              )
            )
          )
          and s.deleted_at is null
          and s.expires_at > now()
        order by s.created_at asc
        limit 40
      `);

      return stories.map(serializeStory);
    },
  );

  app.post(
    "/stories",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = getAuthenticatedUserId(request);

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      if (request.isMultipart()) {
        let upload:
          | Awaited<ReturnType<typeof uploadRequestMedia>>
          | undefined;

        try {
          upload = await uploadRequestMedia(
            request,
            userId,
            "story",
          );
          const asset = await claimOwnedMediaAsset(
            userId,
            upload.publicId,
            ["story"],
          );
          const parsedVisibility = storyVisibilitySchema.safeParse(
            upload.fields.visibility ?? "contacts",
          );

          if (!parsedVisibility.success) {
            throw new MediaServiceError(
              "Invalid story privacy setting",
              400,
            );
          }

          const story = await createStoryRecord({
            userId,
            mediaUrl: asset.deliveryUrl,
            mediaPublicId: asset.publicId,
            mediaSecureUrl: asset.secureUrl,
            mediaResourceType: asset.resourceType,
            mediaType:
              asset.kind === "video" ? "video" : "image",
            visibility: parsedVisibility.data,
            caption:
              upload.fields.caption?.trim().slice(0, 220) ||
              undefined,
          });

          if (!story) {
            throw new Error("Failed to publish story");
          }

          const serializedStory = serializeStory(story);

          void emitStoryCreated(serializedStory).catch((error) => {
            request.log.error(
              {
                err: error,
                storyId: serializedStory.id,
              },
              "Failed to broadcast story creation",
            );
          });

          return reply.status(201).send(serializedStory);
        } catch (error) {
          if (upload) {
            await deleteMediaAsset(
              upload.publicId,
              upload.resourceType,
            ).catch((cleanupError) => {
              request.log.error(
                {
                  err: cleanupError,
                  publicId: upload?.publicId,
                },
                "Failed to clean rejected story upload",
              );
            });
          }

          return reply
            .status(
              error instanceof MediaServiceError
                ? error.statusCode
                : 503,
            )
            .send({
            message:
              error instanceof Error
                ? error.message
                : "Invalid story upload request",
            });
        }
      }

      const parsedBody = storyBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid story upload request",
        });
      }

      let claimedAsset:
        | Awaited<ReturnType<typeof claimOwnedMediaAsset>>
        | undefined;
      let story: Awaited<ReturnType<typeof createStoryRecord>>;

      try {
        if (parsedBody.data.mediaType !== "text") {
          claimedAsset = await claimOwnedMediaAsset(
            userId,
            parsedBody.data.mediaPublicId!,
            ["story"],
          );

          if (claimedAsset.kind !== parsedBody.data.mediaType) {
            throw new MediaServiceError(
              "Uploaded story media type does not match the request",
              400,
            );
          }
        }

        story = await createStoryRecord({
          userId,
          mediaUrl:
            claimedAsset?.deliveryUrl ??
            TEXT_STORY_MEDIA_URL,
          mediaPublicId: claimedAsset?.publicId,
          mediaSecureUrl: claimedAsset?.secureUrl,
          mediaResourceType: claimedAsset?.resourceType,
          mediaType: parsedBody.data.mediaType,
          visibility: parsedBody.data.visibility,
          caption: parsedBody.data.caption,
        });
      } catch (error) {
        if (claimedAsset) {
          await deleteMediaAsset(
            claimedAsset.publicId,
            claimedAsset.resourceType,
          ).catch((cleanupError) => {
            request.log.error(
              {
                err: cleanupError,
                publicId: claimedAsset?.publicId,
              },
              "Failed to clean unpublished story upload",
            );
          });
        }

        if (error instanceof MediaServiceError) {
          return reply.status(error.statusCode).send({
            message: error.message,
          });
        }

        throw error;
      }

      if (!story) {
        if (claimedAsset) {
          await releaseClaimedMediaAsset(
            claimedAsset.publicId,
          );
        }

        return reply.status(500).send({
          message: "Failed to publish story",
        });
      }

      const serializedStory = serializeStory(story);

      void emitStoryCreated(serializedStory).catch((error) => {
        request.log.error(
          {
            err: error,
            storyId: serializedStory.id,
          },
          "Failed to broadcast story creation",
        );
      });

      return reply.status(201).send(serializedStory);
    },
  );

  app.patch(
    "/stories/:storyId/privacy",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = getAuthenticatedUserId(request);

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedParams = storyParamsSchema.safeParse(request.params);
      const parsedBody = storyPrivacyBodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid story privacy request",
        });
      }

      const currentStory = await getStoryById(
        parsedParams.data.storyId,
        userId,
      );

      if (!currentStory || currentStory.userId !== userId) {
        return reply.status(404).send({
          message: "Story unavailable",
        });
      }

      await db.execute(sql`
        update stories
        set visibility = ${parsedBody.data.visibility}
        where id = ${currentStory.id}
          and user_id = ${userId}
          and deleted_at is null
          and expires_at > now()
      `);

      const updatedStory = await getStoryById(currentStory.id, userId);

      if (!updatedStory) {
        return reply.status(404).send({
          message: "Story unavailable",
        });
      }

      const serializedStory = serializeStory(updatedStory);
      const io = getSocketServer();

      if (io && currentStory.visibility !== serializedStory.visibility) {
        io.to(`user:${userId}`).emit(
          SOCKET_EVENTS.STORY_PRIVACY_UPDATED,
          serializedStory,
        );

        const contactUserIds = await getVisibleStoryUserIds(
          userId,
          "contacts",
        );

        contactUserIds
          .filter((audienceUserId) => audienceUserId !== userId)
          .forEach((audienceUserId) => {
            if (serializedStory.visibility === "contacts") {
              io.to(`user:${audienceUserId}`).emit(
                SOCKET_EVENTS.STORY_PRIVACY_UPDATED,
                serializedStory,
              );
              return;
            }

            io.to(`user:${audienceUserId}`).emit(
              SOCKET_EVENTS.STORY_DELETED,
              {
                storyId: serializedStory.id,
                deletedAt: new Date().toISOString(),
              },
            );
          });
      }

      return serializedStory;
    },
  );

  app.post(
    "/stories/:storyId/view",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = getAuthenticatedUserId(request);

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

      const insertedViews = await db.execute<{ id: string }>(sql`
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
        returning id
      `);

      if (insertedViews.length && story.userId !== userId) {
        getSocketServer()
          ?.to(`user:${story.userId}`)
          .emit(SOCKET_EVENTS.STORY_VIEWED, {
            storyId: story.id,
            viewerId: userId,
            viewedAt: new Date().toISOString(),
          });
      }

      return {
        ok: true,
      };
    },
  );

  app.get(
    "/stories/:storyId/views",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = getAuthenticatedUserId(request);

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const parsedParams = storyParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: "Invalid story viewer request",
        });
      }

      const storyRows = await db.execute<{
        id: string;
      }>(sql`
        select id
        from stories
        where id = ${parsedParams.data.storyId}
          and user_id = ${userId}
          and deleted_at is null
          and expires_at > now()
        limit 1
      `);

      if (!storyRows.length) {
        return reply.status(404).send({
          message: "Story unavailable",
        });
      }

      const viewers = await db.execute<StoryViewerRow>(sql`
        select
          u.id,
          u.username,
          u.avatar,
          sv.viewed_at as "viewedAt"
        from story_views sv
        inner join users u
          on u.id = sv.user_id
          and u.is_deleted = false
        where sv.story_id = ${parsedParams.data.storyId}
          and sv.user_id <> ${userId}
        order by sv.viewed_at desc
        limit 200
      `);

      return viewers.map(serializeStoryViewer);
    },
  );

  app.delete(
    "/stories/:storyId",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = getAuthenticatedUserId(request);

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

      const deletedStories = await db.execute<{
        id: string;
        visibility: StoryVisibility;
        mediaPublicId: string | null;
        mediaResourceType: string | null;
      }>(sql`
        update stories
        set deleted_at = now()
        where id = ${parsedParams.data.storyId}
          and user_id = ${userId}
          and deleted_at is null
        returning
          id,
          coalesce(visibility, 'contacts') as visibility,
          media_public_id as "mediaPublicId",
          media_resource_type as "mediaResourceType"
      `);

      if (!deletedStories.length) {
        return reply.status(404).send({
          message: "Story unavailable",
        });
      }

      const io = getSocketServer();

      if (io) {
        const audienceUserIds = await getVisibleStoryUserIds(
          userId,
          deletedStories[0].visibility,
        );

        audienceUserIds.forEach((audienceUserId) => {
          io.to(`user:${audienceUserId}`).emit(SOCKET_EVENTS.STORY_DELETED, {
            storyId: parsedParams.data.storyId,
            deletedAt: new Date().toISOString(),
          });
        });
      }

      await deleteMediaAsset(
        deletedStories[0].mediaPublicId,
        deletedStories[0].mediaResourceType,
      ).catch((error) => {
        request.log.error(
          {
            err: error,
            storyId: deletedStories[0].id,
          },
          "Story media deletion queued for retry",
        );
      });

      return {
        ok: true,
      };
    },
  );
}
