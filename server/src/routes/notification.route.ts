import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authMiddleware } from "../middleware/auth.middleware.js";

const notificationParamsSchema = z.object({
  notificationId:
    z.string().trim().min(1).max(160),
});

const notificationReadBodySchema = z.object({
  read: z.boolean(),
});

export async function notificationRoutes(
  app: FastifyInstance
) {
  app.get(
    "/notifications",
    {
      preHandler:
        authMiddleware,
    },
    async () => {
      return {
        notifications: [],
      };
    }
  );

  app.patch(
    "/notifications/read",
    {
      preHandler:
        authMiddleware,
    },
    async () => {
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
          message: "Invalid notification request",
        });
      }

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
          message: "Invalid notification request",
        });
      }

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
    async () => {
      return {
        ok: true,
      };
    }
  );
}
