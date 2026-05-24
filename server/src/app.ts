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
import { authRoutes } from "./routes/auth.route.js";
import { conversationRoutes } from "./routes/conversation.route.js";
import { messageRoutes } from "./routes/messages.route.js";
import { notificationRoutes } from "./routes/notification.route.js";
import { storyRoutes } from "./routes/story.route.js";
import { uploadRoutes } from "./routes/upload.route.js";
import { userRoutes } from "./routes/user.route.js";
import { getSocketServer } from "./socket/socket-hub.js";
import { SOCKET_EVENTS } from "./socket/socket-events.js";

function buildCorsOrigin() {
  if (env.NODE_ENV !== "production") {
    return true;
  }

  if (!process.env.CORS_ORIGIN?.trim()) {
    console.warn(
      "CORS_ORIGIN is not set in production; allowing all origins.",
    );

    return true;
  }

  return env.CORS_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function buildApp() {
  const uploadsDir = path.resolve(process.cwd(), "uploads");

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
    trustProxy:
      env.NODE_ENV === "production"
        ? 1
        : false,
  });

  await app.register(cors, {
    origin: buildCorsOrigin(),
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  await app.register(FastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
  });

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(messageRoutes);
  await app.register(notificationRoutes);
  await app.register(conversationRoutes);
  await app.register(storyRoutes);
  await app.register(uploadRoutes);

  app.get("/", async () => {
    return {
      message: "FlexChat API running",
    };
  });

  app.get("/health", async (_, reply) => {
    try {
      await db.execute(sql`select 1`);

      return {
        status: "ok",
        db: "ok",
        ts: Date.now(),
      };
    } catch {
      reply.status(503);

      return {
        status: "error",
        db: "unreachable",
        ts: Date.now(),
      };
    }
  });

  return app;
}
