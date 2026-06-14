import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { db } from "../db/index.js";
import { fcmTokens } from "../db/schema/fcm-tokens.js";
import { notifications } from "../db/schema/notifications.js";
import { generateId } from "../lib/uuid.js";

const notificationParamsSchema = z.object({
  notificationId:
    z.string().trim().min(1).max(160),
});

const notificationReadBodySchema = z.object({
  read: z.boolean(),
});

const fcmTokenBodySchema = z.object({
  token: z.string().trim().min(1),
  deviceType: z.enum(["web", "android", "ios"]).default("web"),
});

export async function notificationRoutes(
  app: FastifyInstance
) {
  app.post(
    "/notifications/fcm-token",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const parsedBody = fcmTokenBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid FCM token request",
        });
      }

      const { token, deviceType } = parsedBody.data;
      const userId = (request.user as any).id;

      try {
        // Upsert token
        const existingToken = await db
          .select()
          .from(fcmTokens)
          .where(eq(fcmTokens.token, token))
          .limit(1);

        if (existingToken.length > 0) {
          await db
            .update(fcmTokens)
            .set({
              userId,
              deviceType,
              lastUsedAt: new Date(),
            })
            .where(eq(fcmTokens.token, token));
        } else {
          await db.insert(fcmTokens).values({
            id: generateId(),
            userId,
            token,
            deviceType,
            lastUsedAt: new Date(),
          });
        }

        return { ok: true };
      } catch (error) {
        request.log.error(error, "Failed to register FCM token");
        return reply.status(500).send({
          message: "Failed to register FCM token",
        });
      }
    }
  );

  app.delete(
    "/notifications/fcm-token/:token",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const userId = (request.user as any).id;

      try {
        await db
          .delete(fcmTokens)
          .where(and(eq(fcmTokens.token, token), eq(fcmTokens.userId, userId)));

        return { ok: true };
      } catch (error) {
        request.log.error(error, "Failed to delete FCM token");
        return reply.status(500).send({
          message: "Failed to delete FCM token",
        });
      }
    }
  );

  app.get(
    "/notifications",
    {
      preHandler:
        authMiddleware,
    },
    async (request) => {
      const userId = (request.user as any).id;

      const results = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      return {
        notifications: results,
      };
    }
  );

  app.patch(
    "/notifications/read",
    {
      preHandler:
        authMiddleware,
    },
    async (request) => {
      const userId = (request.user as any).id;

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

      return {
        ok: true,
      };
    }
  );

  app.patch(
    "/notifications/:notificationId/read",
    {
      preHandler:
        authMiddleware,
    },
    async (request, reply) => {
      const parsedParams =
        notificationParamsSchema.safeParse(
          request.params
        );
      const parsedBody =
        notificationReadBodySchema.safeParse(
          request.body
        );

      if (
        !parsedParams.success ||
        !parsedBody.success
      ) {
        return reply.status(400).send({
          message: "Invalid notification read request",
        });
      }

      const { notificationId } = parsedParams.data;
      const { read } = parsedBody.data;
      const userId = (request.user as any).id;

      await db
        .update(notifications)
        .set({ isRead: read })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

      return {
        ok: true,
      };
    }
  );

  app.delete(
    "/notifications/:notificationId",
    {
      preHandler:
        authMiddleware,
    },
    async (request, reply) => {
      const parsedParams =
        notificationParamsSchema.safeParse(
          request.params
        );

      if (!parsedParams.success) {
        return reply.status(400).send({
          message: "Invalid notification deletion request",
        });
      }

      const { notificationId } = parsedParams.data;
      const userId = (request.user as any).id;

      await db
        .delete(notifications)
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

      return {
        ok: true,
      };
    }
  );

  app.delete(
    "/notifications",
    {
      preHandler:
        authMiddleware,
    },
    async (request) => {
      const userId = (request.user as any).id;

      await db
        .delete(notifications)
        .where(eq(notifications.userId, userId));

      return {
        ok: true,
      };
    }
  );
}
