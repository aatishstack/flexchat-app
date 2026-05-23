import { FastifyInstance } from "fastify";

import bcrypt from "bcrypt";

import { and, eq, sql } from "drizzle-orm";

import { z } from "zod";

import { db } from "../db/index.js";

import { users } from "../db/schema/users.js";

import { generateId } from "../lib/uuid.js";
import { signToken } from "../lib/jwt.js";
import { getFirebaseAuth } from "../lib/firebase-admin.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const blockedDomains = new Set([
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "fakeinbox.com",
]);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerBodySchema = z.object({
  username: z.string().trim().min(1).max(32),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

const firebaseLoginBodySchema = z.object({
  idToken: z.string().trim().min(20).max(4096),
});

function publicUser(user: {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  createdAt?: Date | string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar ?? null,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : (user.createdAt ?? null),
  };
}

type UserRow = {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar: string | null;
  createdAt: Date;
};

function normalizeUsername(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return normalized || "flexuser";
}

async function createUniqueUsername(preferredName: string) {
  const baseUsername = normalizeUsername(preferredName);

  for (let index = 0; index < 12; index += 1) {
    const candidate =
      index === 0
        ? baseUsername
        : `${baseUsername}_${generateId().replace(/-/g, "").slice(0, 6)}`.slice(
            0,
            32,
          );

    const existingUser = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(and(eq(users.username, candidate), eq(users.isDeleted, false)));

    if (!existingUser.length) {
      return candidate;
    }
  }

  return `flex_${generateId().replace(/-/g, "").slice(0, 12)}`;
}

export async function authRoutes(app: FastifyInstance) {
  // REGISTER
  app.post(
    "/auth/register",

    async (request, reply) => {
      const parsedBody = registerBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid registration request",
        });
      }

      const { username, email, password } = parsedBody.data;

      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          message: "Invalid email address",
        });
      }

      const domain = email.split("@")[1];

      if (blockedDomains.has(domain)) {
        return reply.status(400).send({
          message: "Temporary emails are not allowed",
        });
      }

      if (password.length < 8) {
        return reply.status(400).send({
          message: "Password must be at least 8 characters",
        });
      }

      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.isDeleted, false)));

      if (existingUser.length) {
        return reply.status(400).send({
          message: "Email already exists",
        });
      }

      const existingUsername = await db
        .select()
        .from(users)
        .where(and(eq(users.username, username), eq(users.isDeleted, false)));

      if (existingUsername.length) {
        return reply.status(400).send({
          message: "Username already taken",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = {
        id: generateId(),

        username: username,

        email: email,

        password: hashedPassword,
      };

      const insertedUsers = await db.execute<UserRow>(sql`
        insert into users (
          id,
          username,
          email,
          password
        )
        values (
          ${newUser.id},
          ${newUser.username},
          ${newUser.email},
          ${newUser.password}
        )
        returning
          id,
          username,
          email,
          password,
          avatar,
          created_at as "createdAt"
      `);
      const createdUser = insertedUsers[0] ?? newUser;

      const token = signToken({
        id: createdUser.id,
      });

      return {
        token,

        user: publicUser(createdUser),
      };
    },
  );

  app.post("/auth/firebase/google", async (request, reply) => {
    const parsedBody = firebaseLoginBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.status(400).send({
        message: "Invalid Google sign-in request",
      });
    }

    let decodedToken;

    try {
      decodedToken = await getFirebaseAuth().verifyIdToken(
        parsedBody.data.idToken,
        true,
      );
    } catch {
      return reply.status(401).send({
        message: "Google sign-in could not be verified",
      });
    }

    const email = decodedToken.email?.trim().toLowerCase();

    if (!email || !decodedToken.email_verified) {
      return reply.status(401).send({
        message: "Google account email is not verified",
      });
    }

    const existingUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)));
    let user: UserRow | undefined = existingUsers[0];

    if (user) {
      const googleAvatar = decodedToken.picture ?? null;

      if (googleAvatar && !user.avatar) {
        const updatedUsers = await db.execute<UserRow>(sql`
                update users
                set avatar = ${googleAvatar}
                where id = ${user.id}
                returning
                  id,
                  username,
                  email,
                  password,
                  avatar,
                  created_at as "createdAt"
              `);

        user = updatedUsers[0] ?? user;
      }
    } else {
      const preferredUsername =
        decodedToken.name ?? email.split("@")[0] ?? "flexuser";
      const username = await createUniqueUsername(preferredUsername);
      const password = await bcrypt.hash(
        `firebase:${decodedToken.uid}:${generateId()}`,
        10,
      );

      const userId = generateId();
      const newUsers = await db.execute<UserRow>(sql`
              insert into users (
                id,
                username,
                email,
                password,
                avatar
              )
              values (
                ${userId},
                ${username},
                ${email},
                ${password},
                ${decodedToken.picture ?? null}
              )
              returning
                id,
                username,
                email,
                password,
                avatar,
                created_at as "createdAt"
            `);

      user = newUsers[0];
    }

    if (!user) {
      return reply.status(500).send({
        message: "Google sign-in failed",
      });
    }

    const token = signToken({
      id: user.id,
    });

    return {
      token,
      user: publicUser(user),
    };
  });

  // LOGIN
  app.post(
    "/auth/login",

    async (request, reply) => {
      const parsedBody = loginBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid login request",
        });
      }

      const { email, password } = parsedBody.data;

      const foundUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.isDeleted, false)));

      const user = foundUser[0];

      if (!user) {
        return reply.status(400).send({
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return reply.status(400).send({
          message: "Invalid credentials",
        });
      }

      const token = signToken({
        id: user.id,
      });

      return {
        token,

        user: publicUser(user),
      };
    },
  );

  app.post(
    "/auth/refresh",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const foundUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.isDeleted, false)));

      const user = foundUser[0];

      if (!user) {
        return reply.status(404).send({
          message: "User not found",
        });
      }

      return {
        token: signToken({
          id: user.id,
        }),
        user: publicUser(user),
      };
    },
  );
}
