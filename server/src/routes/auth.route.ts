import {
  FastifyInstance,
} from "fastify";

import bcrypt from "bcrypt";

import { eq } from "drizzle-orm";

import { z } from "zod";

import { db } from "../db/index.js";

import { users } from "../db/schema/users.js";

import { signToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const blockedDomains = new Set([
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "fakeinbox.com",
]);

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerBodySchema = z.object({
  username:
    z.string().trim().min(1).max(32),
  email:
    z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(254),
  password:
    z.string().min(8).max(128),
});

const loginBodySchema = z.object({
  email:
    z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(254),
  password:
    z.string().min(1).max(128),
});

function publicUser(user: {
  id: string;
  username: string;
  email: string;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

export async function authRoutes(
  app: FastifyInstance
) {
  // REGISTER
  app.post(
    "/auth/register",

    async (
      request,
      reply
    ) => {
      const parsedBody =
        registerBodySchema.safeParse(
          request.body
        );

      if (!parsedBody.success) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid registration request",
          });
      }

      const {
        username,
        email,
        password,
      } = parsedBody.data;

      if (
        !emailRegex.test(email)
      ) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid email address",
          });
      }

      const domain =
        email.split("@")[1];

      if (
        blockedDomains.has(domain)
      ) {
        return reply
          .status(400)
          .send({
            message:
              "Temporary emails are not allowed",
          });
      }

      if (password.length < 8) {
        return reply
          .status(400)
          .send({
            message:
              "Password must be at least 8 characters",
          });
      }

      const existingUser =
        await db
          .select()
          .from(
            users
          )
          .where(
            eq(
              users.email,
              email
            )
          );

      if (
        existingUser.length
      ) {
        return reply
          .status(400)
          .send({
            message:
              "Email already exists",
          });
      }

      const existingUsername =
        await db
          .select()
          .from(
            users
          )
          .where(
            eq(
              users.username,
              username
            )
          );

      if (
        existingUsername.length
      ) {
        return reply
          .status(400)
          .send({
            message:
              "Username already taken",
          });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const newUser = {
        id:
          crypto.randomUUID(),

        username:
          username,

        email:
          email,

        password:
          hashedPassword,
      };

      await db
        .insert(users)
        .values(
          newUser
        );

      const token =
        signToken({
          id:
            newUser.id,
        });

      return {
        token,

        user:
          publicUser(newUser),
      };
    }
  );

  // LOGIN
  app.post(
    "/auth/login",

    async (
      request,
      reply
    ) => {
      const parsedBody =
        loginBodySchema.safeParse(
          request.body
        );

      if (!parsedBody.success) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid login request",
          });
      }

      const {
        email,
        password,
      } = parsedBody.data;

      const foundUser =
        await db
          .select()
          .from(
            users
          )
          .where(
            eq(
              users.email,
              email
            )
          );

      const user =
        foundUser[0];

      if (!user) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid credentials",
          });
      }

      const validPassword =
        await bcrypt.compare(
          password,
          user.password
        );

      if (
        !validPassword
      ) {
        return reply
          .status(400)
          .send({
            message:
              "Invalid credentials",
          });
      }

      const token =
        signToken({
          id: user.id,
        });

      return {
        token,

        user:
          publicUser(user),
      };
    }
  );

  app.post(
    "/auth/refresh",
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

      const foundUser =
        await db
          .select()
          .from(
            users
          )
          .where(
            eq(
              users.id,
              userId
            )
          );

      const user =
        foundUser[0];

      if (!user) {
        return reply
          .status(404)
          .send({
            message:
              "User not found",
          });
      }

      return {
        token:
          signToken({
            id: user.id,
          }),
        user:
          publicUser(user),
      };
    }
  );
}
