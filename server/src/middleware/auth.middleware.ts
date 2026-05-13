import {
  FastifyReply,
  FastifyRequest,
} from "fastify";

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