import path from "path";
import fs from "fs";

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import FastifyStatic from "@fastify/static";
import { sql } from "drizzle-orm";

import { env } from "./config/env.js";
import { db } from "./db/index.js";
import { isAllowedOrigin } from "./lib/origins.js";
import { authRoutes } from "./routes/auth.route.js";
import { conversationRoutes } from "./routes/conversation.route.js";
import { messageRoutes } from "./routes/messages.route.js";
import { notificationRoutes } from "./routes/notification.route.js";
import { storyRoutes } from "./routes/story.route.js";
import { uploadRoutes } from "./routes/upload.route.js";
import { userRoutes } from "./routes/user.route.js";
import { getSocketServer } from "./socket/socket-hub.js";
import { SOCKET_EVENTS } from "./socket/socket-events.js";

function getUploadedFilenameFromUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const publicApiUrl = new URL(env.PUBLIC_API_URL);

    if (
      parsedUrl.origin !== publicApiUrl.origin ||
      !parsedUrl.pathname.startsWith("/uploads/")
    ) {
      return null;
    }

    const filename = path.basename(parsedUrl.pathname);

    return filename && filename !== "uploads" ? filename : null;
  } catch {
    return null;
  }
}

async function getReferencedUploadFilenames() {
  const rows = await db.execute<{
    url: string | null;
  }>(sql`
    select avatar as url
    from users
    where avatar is not null
      and is_deleted = false
    union
    select attachment as url
    from messages
    where attachment is not null
      and deleted_at is null
    union
    select audio as url
    from messages
    where audio is not null
      and deleted_at is null
    union
    select media_url as url
    from stories
    where media_url is not null
      and deleted_at is null
      and expires_at > now()
  `);

  return new Set(
    rows
      .map((row) => getUploadedFilenameFromUrl(row.url))
      .filter((filename): filename is string => Boolean(filename)),
  );
}

async function cleanupExpiredUploads(uploadsDir: string) {
  const cutoff = Date.now() - env.UPLOAD_RETENTION_HOURS * 60 * 60 * 1000;
  const referencedUploads = await getReferencedUploadFilenames();

  const entries = await fs.promises.readdir(uploadsDir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (referencedUploads.has(entry.name)) {
      continue;
    }

    const filepath = path.join(uploadsDir, entry.name);

    const stats = await fs.promises.stat(filepath).catch(() => null);

    if (!stats || stats.mtimeMs > cutoff) {
      continue;
    }

    await fs.promises.unlink(filepath).catch(() => undefined);
  }
}

async function removeUploadedAsset(uploadsDir: string, url?: string | null) {
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

    const filepath = path.resolve(uploadsDir, filename);

    if (!filepath.startsWith(`${path.resolve(uploadsDir)}${path.sep}`)) {
      return;
    }

    await fs.promises.unlink(filepath).catch(() => undefined);
  } catch {
    return;
  }
}

function resolveUploadPath(uploadsDir: string, mediaId: string) {
  const decodedId = decodeURIComponent(mediaId);
  const basename = path.basename(decodedId);

  if (!basename || basename !== decodedId || basename.includes("..")) {
    return null;
  }

  const directPath = path.resolve(uploadsDir, basename);

  if (directPath.startsWith(`${uploadsDir}${path.sep}`)) {
    return directPath;
  }

  return null;
}

async function findUploadByMediaId(uploadsDir: string, mediaId: string) {
  const directPath = resolveUploadPath(uploadsDir, mediaId);

  if (directPath && await fs.promises.stat(directPath).then((stat) => stat.isFile()).catch(() => false)) {
    return directPath;
  }

  if (path.extname(mediaId)) {
    return null;
  }

  const entries = await fs.promises.readdir(uploadsDir, {
    withFileTypes: true,
  });
  const match = entries.find(
    (entry) =>
      entry.isFile() &&
      path.parse(entry.name).name === mediaId,
  );

  return match ? path.resolve(uploadsDir, match.name) : null;
}

function getContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".ogg":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

async function ensureCriticalSchema() {
  await db.execute(sql`
    alter table users
      add column if not exists is_deleted boolean default false not null
  `);

  await db.execute(sql`
    alter table users
      add column if not exists deleted_at timestamp
  `);

  await db.execute(sql`
    alter table users
      add column if not exists last_seen_at timestamp
  `);

  await db.execute(sql`
    alter table conversations
      add column if not exists shared_theme_id text
  `);

  await db.execute(sql`
    alter table conversations
      add column if not exists theme_updated_by text
  `);

  await db.execute(sql`
    alter table conversations
      add column if not exists theme_updated_at timestamp
  `);

  await db.execute(sql`
    alter table messages
      add column if not exists reply_to_message_id text
  `);

  await db.execute(sql`
    alter table messages
      add column if not exists reply_to_text text
  `);

  await db.execute(sql`
    create index if not exists messages_reply_source_idx
      on messages (reply_to_message_id)
  `);

  await db.execute(sql`
    create table if not exists conversation_user_settings (
      id text primary key not null,
      conversation_id text not null,
      user_id text not null,
      archived_at timestamp,
      hidden_at timestamp,
      local_theme_id text,
      updated_at timestamp default now() not null
    )
  `);

  await db.execute(sql`
    create unique index if not exists conversation_user_settings_conversation_user_idx
      on conversation_user_settings (conversation_id, user_id)
  `);

  await db.execute(sql`
    create index if not exists conversation_user_settings_user_archived_idx
      on conversation_user_settings (user_id, archived_at)
  `);

  await db.execute(sql`
    create table if not exists discover_dismissals (
      id text primary key not null,
      user_id text not null,
      dismissed_user_id text not null,
      created_at timestamp default now() not null
    )
  `);

  await db.execute(sql`
    create unique index if not exists discover_dismissals_user_dismissed_idx
      on discover_dismissals (user_id, dismissed_user_id)
  `);

  await db.execute(sql`
    create index if not exists discover_dismissals_user_created_at_idx
      on discover_dismissals (user_id, created_at)
  `);
}

async function cleanupExpiredStories(uploadsDir: string) {
  const expiredStories = await db.execute<{
    id: string;
    mediaUrl: string;
  }>(sql`
    update stories
    set deleted_at = now()
    where deleted_at is null
      and expires_at <= now()
    returning
      id,
      media_url as "mediaUrl"
  `);

  if (!expiredStories.length) {
    return;
  }

  const deletedAt = new Date().toISOString();
  const io = getSocketServer();

  expiredStories.forEach((story) => {
    io?.emit(SOCKET_EVENTS.STORY_DELETED, {
      storyId: story.id,
      deletedAt,
    });
  });

  await Promise.all(
    expiredStories.map((story) => removeUploadedAsset(uploadsDir, story.mediaUrl)),
  );
}

export async function buildApp() {
  const uploadsDir = path.resolve(process.cwd(), "uploads");

  await ensureCriticalSchema();

  await fs.promises.mkdir(uploadsDir, {
    recursive: true,
  });

  const app = Fastify({
    logger:
      env.NODE_ENV === "production"
        ? {
            level: "info",
          }
        : true,
  });

  await app.register(cors, {
    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],

    exposedHeaders: ["x-next-cursor"],

    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });

  await app.register(multipart);

  app.addHook("onRequest", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");

    reply.header("X-Frame-Options", "DENY");

    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");

    reply.header(
      "Permissions-Policy",
      "camera=(self), microphone=(self), geolocation=()",
    );

    if (env.NODE_ENV === "production") {
      reply.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }
  });

  await app.register(FastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
  });

  app.get("/media/:mediaId", async (request, reply) => {
    const mediaId =
      (request.params as { mediaId?: string }).mediaId ?? "";
    const filepath = await findUploadByMediaId(uploadsDir, mediaId);

    if (!filepath) {
      return reply.status(404).send({
        message: "Media unavailable",
      });
    }

    const stat = await fs.promises.stat(filepath);

    reply.header("Content-Type", getContentType(filepath));
    reply.header("Content-Length", stat.size);
    reply.header("Cache-Control", "private, max-age=3600");

    return reply.send(fs.createReadStream(filepath));
  });

  const uploadCleanupTimer = setInterval(
    () => {
      void cleanupExpiredUploads(uploadsDir).catch((error) => {
        app.log.warn(
          {
            err: error,
          },
          "Upload cleanup failed",
        );
      });
    },
    env.UPLOAD_CLEANUP_INTERVAL_MINUTES * 60 * 1000,
  );
  const storyCleanupTimer = setInterval(
    () => {
      void cleanupExpiredStories(uploadsDir).catch((error) => {
        app.log.warn(
          {
            err: error,
          },
          "Story cleanup failed",
        );
      });
    },
    env.UPLOAD_CLEANUP_INTERVAL_MINUTES * 60 * 1000,
  );

  uploadCleanupTimer.unref?.();
  storyCleanupTimer.unref?.();

  app.addHook("onClose", async () => {
    clearInterval(uploadCleanupTimer);
    clearInterval(storyCleanupTimer);
  });

  void cleanupExpiredUploads(uploadsDir).catch((error) => {
    app.log.warn(
      {
        err: error,
      },
      "Initial upload cleanup failed",
    );
  });
  void cleanupExpiredStories(uploadsDir).catch((error) => {
    app.log.warn(
      {
        err: error,
      },
      "Initial story cleanup failed",
    );
  });

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(messageRoutes);
  await app.register(notificationRoutes);
  await app.register(conversationRoutes);
  await app.register(storyRoutes);
  await app.register(uploadRoutes);

  app.setErrorHandler((error, request, reply) => {
    const requestError = error as {
      statusCode?: number;
      message?: string;
    };

    request.log.error(
      {
        err: error,
      },
      "Unhandled request error",
    );

    const statusCode =
      requestError.statusCode && requestError.statusCode >= 400
        ? requestError.statusCode
        : 500;

    reply.status(statusCode).send({
      message:
        statusCode >= 500 ? "Internal server error" : requestError.message,
    });
  });

  app.get("/", async () => {
    return {
      message: "FlexChat API running",
    };
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "flexchat-api",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/time", async () => {
    const now = new Date();

    return {
      utc: now.toISOString(),
      epochMs: now.getTime(),
    };
  });

  app.get("/ready", async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);

      return {
        status: "ready",
        database: "ok",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.status(503);

      return {
        status: "not_ready",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      };
    }
  });

  return app;
}
