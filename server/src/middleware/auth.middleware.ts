import {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import {
  verifyToken,
} from "../lib/jwt.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader =
      request.headers
        .authorization;

    if (
      !authHeader
    ) {
      return reply
        .status(401)
        .send({
          message:
            "Unauthorized",
        });
    }

    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );

    const decoded =
      verifyToken(
        token
      );

    const activeUsers =
      await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(
          and(
            eq(users.id, decoded.id),
            eq(users.isDeleted, false)
          )
        )
        .limit(1);

    if (!activeUsers.length) {
      return reply
        .status(401)
        .send({
          message:
            "Invalid token",
        });
    }

    request.user =
      decoded;
  } catch {
    return reply
      .status(401)
      .send({
        message:
          "Invalid token",
      });
  }
}
