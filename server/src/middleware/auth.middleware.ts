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
import { getRequestPath } from "../lib/request-path.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestPath = getRequestPath(request.url);
  const authHeader = request.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    request.log.warn(
      {
        method: request.method,
        path: requestPath,
        hasAuthorization: Boolean(authHeader),
      },
      "Auth rejected: missing bearer token",
    );

    return reply
      .status(401)
      .send({
        message:
          "Unauthorized",
      });
  }

  const token = authHeader
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    request.log.warn(
      {
        method: request.method,
        path: requestPath,
      },
      "Auth rejected: empty bearer token",
    );

    return reply
      .status(401)
      .send({
        message:
          "Unauthorized",
      });
  }

  let decoded: ReturnType<typeof verifyToken>;

  try {
    decoded = verifyToken(token);
  } catch (error) {
    request.log.warn(
      {
        err:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
              }
            : "Unknown token verification error",
        method: request.method,
        path: requestPath,
      },
      "Auth rejected: token verification failed",
    );

    return reply
      .status(401)
      .send({
        message:
          "Invalid token",
      });
  }

  try {
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
      request.log.warn(
        {
          method: request.method,
          path: requestPath,
          userId: decoded.id,
        },
        "Auth rejected: token user is unavailable",
      );

      return reply
        .status(401)
        .send({
          message:
            "Invalid token",
        });
    }

    request.user = decoded;
  } catch (error) {
    request.log.error(
      {
        err: error,
        method: request.method,
        path: requestPath,
        userId: decoded.id,
      },
      "Auth service unavailable during user lookup",
    );

    return reply
      .status(503)
      .send({
        message:
          "Authentication service unavailable",
      });
  }
}
