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
    console.log(
      "Socket auth failed: missing token",
    );

    return false;
  }

  try {
    const decoded =
      verifyToken(token);

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
      console.log(
        "Socket auth failed: user not found",
      );

      return false;
    }

    socket.data.user = {
      id: decoded.id,
    };

    return true;
  } catch (error) {
    console.log(
      "Socket auth failed:",
      error,
    );

    return false;
  }
}