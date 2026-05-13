import {
  FastifyInstance,
} from "fastify";

import bcrypt from "bcrypt";

import { eq } from "drizzle-orm";

import { db } from "../db/index.js";

import { users } from "../db/schema/users.js";

import { signToken } from "../lib/jwt.js";

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

      const existingUser =
        await db
          .select()
          .from(
            users
          )
          .where(
            eq(
              users.email,
              body.email
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

      const hashedPassword =
        await bcrypt.hash(
          body.password,
          10
        );

      const newUser = {
        id:
          crypto.randomUUID(),

        username:
          body.username,

        email:
          body.email,

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

        user: {
          id:
            newUser.id,

          username:
            newUser.username,

          email:
            newUser.email,
        },
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

      const foundUser =
        await db
          .select()
          .from(
            users
          )
          .where(
            eq(
              users.email,
              body.email
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
          body.password,
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

        user: {
          id: user.id,

          username:
            user.username,

          email:
            user.email,
        },
      };
    }
  );
}