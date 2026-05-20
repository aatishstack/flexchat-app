import {
  FastifyInstance,
} from "fastify";

import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";

import { users } from "../db/schema/users.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const discoverUsersQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit:
    z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(40),
});

const lookupUsersQuerySchema = z.object({
  ids:
    z
      .string()
      .trim()
      .max(4096)
      .optional(),
});

const updateMeBodySchema = z.object({
  username:
    z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[a-zA-Z0-9_ .-]+$/)
      .optional(),
  avatar:
    z
      .string()
      .url()
      .max(2048)
      .nullable()
      .optional(),
});

function publicUser(user: {
  id: string;
  username: string;
  email?: string;
  avatar?: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    ...(user.email
      ? {
          email: user.email,
        }
      : {}),
    avatar: user.avatar ?? null,
  };
}

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

      return publicUser(user);
    }
  );

  app.patch(
    "/users/me",
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

      const parsedBody =
        updateMeBodySchema.safeParse(
          request.body
        );

      if (!parsedBody.success) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid profile update request",
          });
      }

      const currentUsers =
        await db
          .select()
          .from(users)
          .where(
            eq(
              users.id,
              userId
            )
          );
      const currentUser =
        currentUsers[0];

      if (!currentUser) {
        return reply
          .status(404)
          .send({
            message:
              "User not found",
          });
      }

      if (parsedBody.data.username) {
        const existingUsername =
          await db
            .select({
              id: users.id,
            })
            .from(users)
            .where(
              eq(
                users.username,
                parsedBody.data.username
              )
            );

        if (
          existingUsername.length &&
          existingUsername[0].id !== userId
        ) {
          return reply
            .status(409)
            .send({
              message:
                "Username already taken",
            });
        }
      }

      const nextUsername =
        parsedBody.data.username ??
        currentUser.username;
      const nextAvatar =
        parsedBody.data.avatar !== undefined
          ? parsedBody.data.avatar
          : currentUser.avatar ?? null;

      if (
        nextUsername ===
          currentUser.username &&
        nextAvatar ===
          (currentUser.avatar ?? null)
      ) {
        return publicUser(currentUser);
      }

      const updatedUsers =
        await db
          .execute<{
            id: string;
            username: string;
            email: string;
            avatar: string | null;
          }>(sql`
            update users
            set
              username = ${nextUsername},
              avatar = ${nextAvatar}
            where id = ${userId}
            returning
              id,
              username,
              email,
              avatar
          `);

      const user =
        updatedUsers[0];

      if (!user) {
        return reply
          .status(404)
          .send({
            message:
              "User not found",
          });
      }

      return publicUser(user);
    }
  );

  app.get(
    "/users/discover",
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

      const parsedQuery =
        discoverUsersQuerySchema.safeParse(
          request.query
        );

      if (!parsedQuery.success) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid user discovery request",
          });
      }

      const { q, limit } =
        parsedQuery.data;
      const normalizedQuery =
        q?.trim();
      const searchFilter =
        normalizedQuery
          ? sql`and username ilike ${`%${normalizedQuery}%`}`
          : sql``;

      const discoveredUsers =
        await db.execute<{
          id: string;
          username: string;
          avatar: string | null;
        }>(sql`
          select
            id,
            username,
            avatar
          from users
          where id <> ${userId}
          ${searchFilter}
          order by
            username asc,
            id asc
          limit ${limit}
        `);

      return discoveredUsers.map(
        publicUser
      );
    }
  );

  app.get(
    "/users/lookup",
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

      const parsedQuery =
        lookupUsersQuerySchema.safeParse(
          request.query
        );

      if (!parsedQuery.success) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid user lookup request",
          });
      }

      const ids = Array.from(
        new Set(
          parsedQuery.data.ids
            ?.split(",")
            .map((id) => id.trim())
            .filter(Boolean) ?? []
        )
      ).slice(0, 100);

      if (!ids.length) {
        return [];
      }

      const foundUsers =
        await db
          .select({
            id: users.id,
            username:
              users.username,
            avatar:
              users.avatar,
          })
          .from(users)
          .where(
            inArray(
              users.id,
              ids
            )
          );

      return foundUsers.map(
        publicUser
      );
    }
  );
}
