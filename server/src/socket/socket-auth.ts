import {
  Socket,
} from "socket.io";

import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import {
  verifyToken,
} from "../lib/jwt.js";

export async function authenticateSocket(
  socket: Socket
) {
  const token =
    socket.handshake.auth
      ?.token ??
    socket.handshake.headers
      .authorization
      ?.replace("Bearer ", "");

  if (!token) {
    return false;
  }

  try {
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
      return false;
    }

    socket.data.user =
      {
        id:
          decoded.id,
      };

    return true;
  } catch {
    return false;
  }
}
