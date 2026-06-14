import type { Socket } from "socket.io";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { verifyToken } from "../lib/jwt.js";

export async function authenticateSocket(socket: Socket): Promise<boolean> {
  let token: string | undefined =
    typeof socket.handshake.auth?.token === "string"
      ? socket.handshake.auth.token
      : undefined;

  if (!token && typeof socket.handshake.headers.authorization === "string") {
    token = socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "");
  }

  if (!token) {
    console.warn("[SOCKET] connection rejected reason", {
      socketId: socket.id,
      reason: "missing_token",
    });
    return false;
  }

  let decoded: ReturnType<typeof verifyToken>;

  try {
    decoded = verifyToken(token);
  } catch (error) {
    console.warn("[SOCKET] connection rejected reason", {
      socketId: socket.id,
      reason: "bad_token",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  const activeUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, decoded.id), eq(users.isDeleted, false)))
    .limit(1);

  if (!activeUsers.length) {
    console.warn("[SOCKET] connection rejected reason", {
      socketId: socket.id,
      userId: decoded.id,
      reason: "user_not_found",
    });
    return false;
  }

  socket.data.user = { id: decoded.id };
  return true;
}
