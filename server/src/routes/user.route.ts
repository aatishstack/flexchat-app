import {
  FastifyInstance,
} from "fastify";

import { eq } from "drizzle-orm";

import { db } from "../db/index.js";

import { users } from "../db/schema/users.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

export async function userRoutes(
  app: FastifyInstance
) {
  app.get(
    "/me",

    {
      preHandler:
        authMiddleware,
    },

    async (
      request,
      reply
    ) => {
      const userId =
        request.user?.id;

      if (!userId) {
        return reply
          .status(401)
          .send({
            message:
              "Unauthorized",
          });
      }

      const foundUsers =
        await db
          .select()
          .from(users)
          .where(
            eq(
              users.id,
              userId
            )
          );

      const user =
        foundUsers[0];

      if (!user) {
        return reply
          .status(404)
          .send({
            message:
              "User not found",
          });
      }

      return {
        id: user.id,

        username:
          user.username,

        email:
          user.email,
      };
    }
  );
}