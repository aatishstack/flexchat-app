import type { FastifyInstance } from "fastify";

import { authMiddleware } from "../middleware/auth.middleware.js";

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
}
