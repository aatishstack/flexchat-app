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
    connectTimeout: 30_000,
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    connectionStateRecovery: {
      maxDisconnectionDuration: 5 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  setSocketServer(io);

  io.engine.on("connection", (rawSocket) => {
    console.info("[FlexChat Socket] engine connection", {
      transport: rawSocket.transport.name,
      remoteAddress: rawSocket.request.socket.remoteAddress,
    });

    rawSocket.on("upgrade", (transport) => {
      console.info("[FlexChat Socket] engine transport upgraded", {
        transport: transport.name,
      });
    });

    rawSocket.on("close", (reason) => {
      console.warn("[FlexChat Socket] engine closed", {
        reason,
        transport: rawSocket.transport.name,
      });
    });
  });

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
    console.info("[FlexChat Socket] authenticating socket", {
      socketId: socket.id,
      transport: socket.conn.transport.name,
      hasAuthToken: Boolean(socket.handshake.auth?.token),
      hasQueryToken: Boolean(socket.handshake.query.token),
    });

    const authentication =
      await authenticateSocket(socket);

    if (authentication === "unauthorized") {
      next(new Error("Unauthorized"));

      return;
    }

    if (authentication === "unavailable") {
      next(new Error("Auth unavailable"));

      return;
    }

    next();
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.data.user.id as string;

    const previousOnlineUsers = getOnlineUserIds().join(",");

    addOnlineSocket(userId, socket.id);

    socket.join(`user:${userId}`);

    console.info("[FlexChat Socket] connected", {
      socketId: socket.id,
      userId,
      transport: socket.conn.transport.name,
      recovered: socket.recovered,
    });

    socket.conn.on("upgrade", (transport) => {
      console.info("[FlexChat Socket] socket transport upgraded", {
        socketId: socket.id,
        userId,
        transport: transport.name,
      });
    });

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

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.warn("[FlexChat Socket] disconnected", {
        socketId: socket.id,
        userId,
        reason,
        transport: socket.conn.transport.name,
      });

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
