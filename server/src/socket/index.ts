import type { Server as HttpServer } from "http";

import { Server } from "socket.io";
import { sql } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { authenticateSocket } from "./socket-auth.js";
import { SOCKET_EVENTS } from "./socket-events.js";
import {
  addOnlineSocket,
  getOnlineUserIds,
  removeMissingOnlineSockets,
  removeOnlineSocket,
  touchOnlineSocket,
} from "./socket-store.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { registerTypingHandlers } from "./handlers/typing.handler.js";
import { registerCallHandlers } from "./handlers/call.handler.js";
import { setSocketServer } from "./socket-hub.js";

function buildAllowedOrigins() {
  return Array.from(
    new Set([
      ...env.CORS_ORIGIN
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      "http://localhost:3000",
    ]),
  );
}

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    path: "/socket.io/",
    cors: {
      origin: buildAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: false,
    },
    pingInterval: env.SOCKET_PING_INTERVAL_MS,
    pingTimeout: env.SOCKET_PING_TIMEOUT_MS,
    connectTimeout: env.SOCKET_CONNECT_TIMEOUT_MS,
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    allowEIO3: true,
    connectionStateRecovery: {
      maxDisconnectionDuration: 3 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  setSocketServer(io);

  const presenceCleanupTimer = setInterval(() => {
    const previousOnlineUsers = getOnlineUserIds().join(",");

    const changedUserIds = removeMissingOnlineSockets(
      new Set(io.sockets.sockets.keys()),
    );

    if (!changedUserIds.length) {
      return;
    }

    const nextOnlineUsers = getOnlineUserIds();

    if (previousOnlineUsers !== nextOnlineUsers.join(",")) {
      io.emit(SOCKET_EVENTS.ONLINE_USERS, nextOnlineUsers);
    }

    changedUserIds.forEach((changedUserId) => {
      if (nextOnlineUsers.includes(changedUserId)) {
        return;
      }

      const lastSeenAt = Date.now();

      const lastSeenIso = new Date(lastSeenAt).toISOString();

      void db
        .execute(
          sql`
          update users
          set last_seen_at = ${lastSeenIso}
          where id = ${changedUserId}
            and is_deleted = false
        `,
        )
        .catch((error) => {
          console.error("Failed to persist cleaned-up last seen", error);
        });

      io.emit(SOCKET_EVENTS.PRESENCE_UPDATED, {
        userId: changedUserId,
        status: "offline",
        lastSeenAt,
      });
    });
  }, 30_000);

  presenceCleanupTimer.unref?.();

  io.use(async (socket, next) => {
    try {
      const ok = await authenticateSocket(socket);
      if (!ok) {
        next(new Error("Unauthorized"));
        return;
      }
      next();
    } catch (error) {
      console.error("[FlexChat Socket] auth middleware threw", error);
      next(new Error("Service temporarily unavailable"));
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.data.user.id as string;

    const previousOnlineUsers = getOnlineUserIds().join(",");

    addOnlineSocket(userId, socket.id);

    socket.join(`user:${userId}`);

    socket.onAny(() => {
      touchOnlineSocket(socket.id);
    });

    const nextOnlineUsers = getOnlineUserIds();

    if (previousOnlineUsers !== nextOnlineUsers.join(",")) {
      io.emit(SOCKET_EVENTS.ONLINE_USERS, nextOnlineUsers);
    }

    io.emit(SOCKET_EVENTS.PRESENCE_UPDATED, {
      userId,
      status: "online",
      lastSeenAt: Date.now(),
    });

    registerMessageHandlers(io, socket);

    registerTypingHandlers(io, socket);

    registerCallHandlers(io, socket);

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      const previousOnlineUsers = getOnlineUserIds().join(",");

      const removedUserId = removeOnlineSocket(socket.id);

      const nextOnlineUsers = getOnlineUserIds();

      const isStillOnline = removedUserId
        ? nextOnlineUsers.includes(removedUserId)
        : false;

      const lastSeenAt = Date.now();

      const lastSeenIso = new Date(lastSeenAt).toISOString();

      if (previousOnlineUsers !== nextOnlineUsers.join(",")) {
        io.emit(SOCKET_EVENTS.ONLINE_USERS, nextOnlineUsers);
      }

      if (removedUserId && !isStillOnline) {
        void db
          .execute(
            sql`
                update users
                set last_seen_at = ${lastSeenIso}
                where id = ${removedUserId}
                  and is_deleted = false
              `,
          )
          .catch((error) => {
            console.error("Failed to persist last seen", error);
          });

        io.emit(SOCKET_EVENTS.PRESENCE_UPDATED, {
          userId: removedUserId,
          status: "offline",
          lastSeenAt,
        });
      }
    });
  });

  return io;
}
