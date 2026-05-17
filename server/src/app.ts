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
import { storyRoutes } from "./routes/story.route.js";
import { uploadRoutes } from "./routes/upload.route.js";
import { userRoutes } from "./routes/user.route.js";

async function cleanupExpiredUploads(
  uploadsDir: string
) {
  const cutoff =
    Date.now() -
    env.UPLOAD_RETENTION_HOURS *
      60 *
      60 *
      1000;
  const entries =
    await fs.promises.readdir(
      uploadsDir,
      {
        withFileTypes: true,
      }
    );

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const filepath =
      path.join(uploadsDir, entry.name);
    const stats =
      await fs.promises
        .stat(filepath)
        .catch(() => null);

    if (!stats || stats.mtimeMs > cutoff) {
      continue;
    }

    await fs.promises
      .unlink(filepath)
      .catch(() => undefined);
  }
}

export async function buildApp() {
  const uploadsDir =
    path.join(process.cwd(), "uploads");

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
    exposedHeaders: [
      "x-next-cursor",
    ],
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
    reply.header(
      "X-Content-Type-Options",
      "nosniff"
    );
    reply.header("X-Frame-Options", "DENY");
    reply.header(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
    reply.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );

    if (env.NODE_ENV === "production") {
      reply.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
  });

  await app.register(FastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
  });

  const uploadCleanupTimer = setInterval(() => {
    void cleanupExpiredUploads(uploadsDir).catch(
      (error) => {
        app.log.warn(
          {
            err: error,
          },
          "Upload cleanup failed"
        );
      }
    );
  }, env.UPLOAD_CLEANUP_INTERVAL_MINUTES * 60 * 1000);

  uploadCleanupTimer.unref?.();

  app.addHook("onClose", async () => {
    clearInterval(uploadCleanupTimer);
  });

  void cleanupExpiredUploads(uploadsDir).catch(
    (error) => {
      app.log.warn(
        {
          err: error,
        },
        "Initial upload cleanup failed"
      );
    }
  );

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(messageRoutes);
  await app.register(conversationRoutes);
  await app.register(storyRoutes);
  await app.register(uploadRoutes);

  app.setErrorHandler((error, request, reply) => {
    const requestError =
      error as {
        statusCode?: number;
        message?: string;
      };

    request.log.error(
      {
        err: error,
      },
      "Unhandled request error"
    );

    const statusCode =
      requestError.statusCode &&
      requestError.statusCode >= 400
        ? requestError.statusCode
        : 500;

    reply.status(statusCode).send({
      message:
        statusCode >= 500
          ? "Internal server error"
          : requestError.message,
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
