import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { sql } from "drizzle-orm";
import * as Sentry from "@sentry/node";

import { env } from "./config/env.js";
import { db } from "./db/index.js";
import { getRequestPath } from "./lib/request-path.js";
import { verifyCloudinaryConnection } from "./lib/cloudinary.js";
import { verifyFirebaseConnection } from "./utils/fcm.js";
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

  return Array.from(
    new Set([
      env.FRONTEND_URL,
      env.CLIENT_URL,
      ...(process.env.CORS_ORIGIN ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin && origin !== "*"),
    ].filter(Boolean)),
  );
}

async function checkDatabaseReady() {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      Promise.all([
        db.execute(sql`select 1`),
        db.execute(sql`
          select
            media_assets.client_upload_id,
            users.avatar_public_id,
            conversations.avatar_public_id,
            stories.media_public_id,
            stories.visibility,
            messages.media_public_id
          from media_assets
          cross join users
          cross join conversations
          cross join stories
          cross join messages
          limit 0
        `),
      ]),
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
        .type("application/json")
        .send({
          status: "ok",
          sentry: env.SENTRY_DSN ? "enabled" : "disabled",
        });
    },
  );

  app.addHook("onRequest", async (request) => {
    const requestPath = getRequestPath(request.url);

    if (requestPath === "/health") {
      return;
    }

    const origin = request.headers.origin;

    request.log.info(
      {
        method: request.method,
        path: requestPath,
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
          path: requestPath,
          origin,
        },
        "CORS origin not allowed",
      );
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    const requestPath = getRequestPath(request.url);

    if (requestPath === "/health") {
      return;
    }

    if (reply.statusCode < 400) {
      return;
    }

    request.log.warn(
      {
        method: request.method,
        path: requestPath,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
        origin: request.headers.origin,
        hasAuthorization: Boolean(request.headers.authorization),
      },
      "API request returned an error response",
    );
  });

  app.addHook("onError", async (request, _reply, error) => {
    const requestPath = getRequestPath(request.url);

    if (requestPath === "/health") {
      return;
    }

    if (env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag("path", requestPath);
        scope.setTag("method", request.method);
        scope.setUser({
          id: (request.user as any)?.id || "anonymous",
        });
        Sentry.captureException(error);
      });
    }

    request.log.error(
      {
        err: error,
        method: request.method,
        path: requestPath,
        origin: request.headers.origin,
        hasAuthorization: Boolean(request.headers.authorization),
      },
      "API request failed unexpectedly",
    );
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const requestPath = getRequestPath(request.url);

    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");

    if (requestPath.startsWith("/auth/")) {
      reply.header("Cache-Control", "no-store");
    }

    return payload;
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
      const [dbCheck, cloudinaryCheck, firebaseCheck] = await Promise.allSettled([
        checkDatabaseReady(),
        verifyCloudinaryConnection(),
        verifyFirebaseConnection(),
      ]);

      const dbOk = dbCheck.status === "fulfilled";
      const cloudinaryOk =
        cloudinaryCheck.status === "fulfilled" &&
        cloudinaryCheck.value.ok;
      const firebaseOk =
        firebaseCheck.status === "fulfilled" &&
        firebaseCheck.value.ok;

      const isReady = dbOk && cloudinaryOk && firebaseOk;

      const response = {
        status: isReady ? "ok" : "degraded",
        db: dbOk ? "ok" : "unreachable",
        cloudinary: cloudinaryOk
          ? "ok"
          : cloudinaryCheck.status === "fulfilled"
            ? cloudinaryCheck.value.message
            : "timeout",
        firebase: firebaseOk
          ? "ok"
          : firebaseCheck.status === "fulfilled"
            ? firebaseCheck.value.message
            : "failed",
        sentry: env.SENTRY_DSN ? "enabled" : "disabled",
        ts: Date.now(),
      };

      if (!isReady) {
        reply.status(503);
      }

      return response;
    } catch (error) {
      request.log.error(
        {
          err: error,
        },
        "Readiness check failed",
      );
      reply.status(503);

      return {
        status: "error",
        message: "Internal readiness check failed",
        ts: Date.now(),
      };
    }
  });

  return app;
}
