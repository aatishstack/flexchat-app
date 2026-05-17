import { FastifyInstance } from "fastify";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const blockedDomains = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "fakeinbox.com",
];

export async function authRoutes(
  app: FastifyInstance
) {

  app.post(
    "/register",
    async (req, reply) => {

      try {

        const body =
          req.body as {
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
          body.password?.trim();

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

        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
          blockedDomains.includes(
            domain
          )
        ) {

          return reply
            .status(400)
            .send({
              message:
                "Temporary emails are not allowed",
            });
        }

        if (
          password.length < 8
        ) {

          return reply
            .status(400)
            .send({
              message:
                "Password must be at least 8 characters",
            });
        }

        const existingEmail =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.email,
                email
              )
            )
            .then(
              (res) => res[0]
            );

        if (
          existingEmail
        ) {

          return reply
            .status(409)
            .send({
              message:
                "Email already registered",
            });
        }

        const existingUsername =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.username,
                username
              )
            )
            .then(
              (res) => res[0]
            );

        if (
          existingUsername
        ) {

          return reply
            .status(409)
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

        const createdUser =
          await db
            .insert(users)
            .values({
              id: crypto.randomUUID(),
              username,
              email,
              password:
                hashedPassword,
            })
            .returning();

        const user =
          createdUser[0];

        const token =
          jwt.sign(
            {
              id: user.id,
              email:
                user.email,
            },

            "flexchat_secret",

            {
              expiresIn:
                "7d",
            }
          );

        return reply.send({
          success: true,

          token,

          user: {
            id: user.id,

            username:
              user.username,

            email:
              user.email,
          },
        });

      } catch (error) {

        console.log(error);

        return reply
          .status(500)
          .send({
            message:
              "Internal server error",
          });
      }
    }
  );

  app.post(
    "/login",
    async (req, reply) => {

      try {

        const body =
          req.body as {
            email: string;
            password: string;
          };

        const email =
          body.email
            ?.trim()
            .toLowerCase();

        const password =
          body.password?.trim();

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

        const user =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.email,
                email
              )
            )
            .then(
              (res) => res[0]
            );

        if (!user) {

          return reply
            .status(401)
            .send({
              message:
                "Account not found",
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
            .status(401)
            .send({
              message:
                "Incorrect password",
            });
        }

        const token =
          jwt.sign(
            {
              id: user.id,

              email:
                user.email,
            },

            "flexchat_secret",

            {
              expiresIn:
                "7d",
            }
          );

        return reply.send({
          success: true,

          token,

          user: {
            id: user.id,

            username:
              user.username,

            email:
              user.email,
          },
        });

      } catch (error) {

        console.log(error);

        return reply
          .status(500)
          .send({
            message:
              "Internal server error",
          });
      }
    }
  );
}
