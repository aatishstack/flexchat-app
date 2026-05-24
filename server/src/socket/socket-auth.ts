import { Socket } from "socket.io";

import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { verifyToken } from "../lib/jwt.js";

export async function authenticateSocket(
  socket: Socket,
) {
  let token =
    socket.handshake.auth?.token;

  if (
    !token &&
    typeof socket.handshake.headers.authorization ===
      "string"
  ) {
    token =
      socket.handshake.headers.authorization.replace(
        "Bearer ",
        "",
      );
  }

  if (
    !token &&
    typeof socket.handshake.query.token ===
      "string"
  ) {
    token =
      socket.handshake.query.token;
  }

  if (!token) {
    console.warn(
      "Socket auth rejected: missing token",
      {
        socketId: socket.id,
        transport: socket.conn.transport.name,
      },
    );

    return "unauthorized" as const;
  }

  let decoded: ReturnType<typeof verifyToken>;

  try {
    decoded = verifyToken(token);
  } catch (error) {
    console.warn(
      "Socket auth rejected: token verification failed",
      {
        socketId: socket.id,
        transport: socket.conn.transport.name,
        error:
          error instanceof Error
            ? error.message
            : "Unknown verification error",
      },
    );

    return "unauthorized" as const;
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
            eq(
              users.isDeleted,
              false,
            ),
          ),
        )
        .limit(1);

    if (!activeUsers.length) {
      console.warn(
        "Socket auth rejected: token user is unavailable",
        {
          socketId: socket.id,
          userId: decoded.id,
          transport: socket.conn.transport.name,
        },
      );

      return "unauthorized" as const;
    }

    socket.data.user = {
      id: decoded.id,
    };

    return "authorized" as const;
  } catch (error) {
    console.error(
      "Socket auth unavailable: user lookup failed",
      {
        socketId: socket.id,
        userId: decoded.id,
        transport: socket.conn.transport.name,
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
    );

    return "unavailable" as const;
  }
}
