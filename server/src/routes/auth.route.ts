import {
  FastifyInstance,
} from "fastify";

import bcrypt from "bcrypt";

import { eq } from "drizzle-orm";

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
      const body =
        request.body as {
          username: string;

          email: string;

          password: string;
        };

      const username =
        body.username?.trim();

      const email =
        body.email
          ?.trim()
          .toLowerCase();

      const password =
        body.password ?? "";

      if (
        !username ||
        !email ||
        !password
      ) {
        return reply
          .status(400)
          .send({
            message:
              "All fields are required",
          });
      }

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
      const body =
        request.body as {
          email: string;

          password: string;
        };

      const email =
        body.email
          ?.trim()
          .toLowerCase();

      const password =
        body.password ?? "";

      if (
        !email ||
        !password
      ) {
        return reply
          .status(400)
          .send({
            message:
              "All fields are required",
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
