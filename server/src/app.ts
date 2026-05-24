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

const READINESS_TIMEOUT_MS = 4_000;

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

async function checkDatabaseReady() {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("Database readiness check timed out"));
        }, READINESS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
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
  const corsOrigin = buildCorsOrigin();

  app.get(
    "/health",
    {
      logLevel: "silent",
      config: {
        rateLimit: false,
      },
    },
    async (_request, reply) => {
      return reply
        .code(200)
        .type("text/plain")
        .send("ok");
    },
  );

  app.addHook("onRequest", async (request) => {
    if (request.url === "/health") {
      return;
    }

    const origin = request.headers.origin;

    request.log.info(
      {
        method: request.method,
        url: request.url,
        origin,
        hasAuthorization: Boolean(request.headers.authorization),
      },
      "API request received",
    );

    if (
      env.NODE_ENV === "production" &&
      origin &&
      Array.isArray(corsOrigin) &&
      !corsOrigin.includes(origin)
    ) {
      request.log.warn(
        {
          method: request.method,
          url: request.url,
          origin,
        },
        "CORS origin not allowed",
      );
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    if (request.url === "/health") {
      return;
    }

    if (reply.statusCode < 400) {
      return;
    }

    request.log.warn(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
        origin: request.headers.origin,
        hasAuthorization: Boolean(request.headers.authorization),
      },
      "API request returned an error response",
    );
  });

  app.addHook("onError", async (request, _reply, error) => {
    if (request.url === "/health") {
      return;
    }

    request.log.error(
      {
        err: error,
        method: request.method,
        url: request.url,
        origin: request.headers.origin,
        hasAuthorization: Boolean(request.headers.authorization),
      },
      "API request failed unexpectedly",
    );
  });

  await app.register(cors, {
    origin: corsOrigin,
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

  app.get("/ready", async (request, reply) => {
    try {
      await checkDatabaseReady();

      return {
        status: "ok",
        db: "ok",
        ts: Date.now(),
      };
    } catch (error) {
      request.log.error(
        {
          err: error,
        },
        "Database readiness check failed",
      );
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
