import {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { eq } from "drizzle-orm";

import { db } from "../../db";
import { users } from "../../db/schema";

import {
  hashPassword,
  comparePassword,
} from "../../utils/hash";

import { generateToken } from "../../lib/jwt";

import {
  registerSchema,
  loginSchema,
} from "./auth.schema";

export async function registerController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body =
      registerSchema.parse(request.body);

    const hashedPassword =
      await hashPassword(body.password);

    const newUser =
      await db
        .insert(users)
        .values({
          username: body.username,
          email: body.email,
          password: hashedPassword,
        })
        .returning();

    const token = generateToken(
      newUser[0].id
    );

    return reply.status(201).send({
      success: true,
      token,
      user: newUser[0],
    });
  } catch (error) {
    console.log(error);

    return reply.status(500).send({
      success: false,
      message: "Registration failed",
    });
  }
}

export async function loginController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body =
      loginSchema.parse(request.body);

    const foundUsers =
      await db
        .select()
        .from(users)
        .where(
          eq(users.email, body.email)
        )
        .limit(1);

    const user = foundUsers[0];

    if (!user) {
      return reply.status(401).send({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid =
      await comparePassword(
        body.password,
        user.password
      );

    if (!isPasswordValid) {
      return reply.status(401).send({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user.id);

    return reply.send({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.log(error);

    return reply.status(500).send({
      success: false,
      message: "Login failed",
    });
  }
}