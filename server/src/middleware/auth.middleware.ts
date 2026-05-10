import {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { verifyToken }
  from "../lib/jwt.js";

export async function authMiddleware(
  request: FastifyRequest & {
    user?: {
      userId: string;
    };
  },

  reply: FastifyReply
) {
  try {
    const authHeader =
      request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        message: "Unauthorized",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const decoded =
      verifyToken(token);

    request.user = decoded;

  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: "Invalid token",
    });
  }
}