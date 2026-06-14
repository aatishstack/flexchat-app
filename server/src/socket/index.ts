import type { Server as HttpServer } from "http";

import { Server } from "socket.io";
import { sql } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { debugLog } from "../lib/debug-log.js";
import { deleteMediaAsset } from "../services/media.service.js";
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

type ServerListenerName = "request" | "upgrade";
type ServerListener = ReturnType<HttpServer["listeners"]>[number];
const STORY_EXPIRATION_SWEEP_MS = 5 * 60 * 1000;

function buildAllowedOrigins() {
  const developmentOrigins =
    env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000"];

  return Array.from(
    new Set([
      env.FRONTEND_URL,
      env.CLIENT_URL,
      ...env.CORS_ORIGIN
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      ...developmentOrigins,
    ].filter((origin): origin is string => Boolean(origin))),
  );
}

function prioritizeNewListeners(
  server: HttpServer,
  eventName: ServerListenerName,
  previousListeners: ServerListener[],
) {
  const newListeners = server
    .listeners(eventName)
    .filter((listener) => !previousListeners.includes(listener));

  newListeners.reverse().forEach((listener) => {
    server.off(eventName, listener);
    server.prependListener(eventName, listener);
  });
}

function startExpiredStoryCleanup(io: Server) {
  const sweepExpiredStories = async () => {
    const expiredAt = new Date().toISOString();
    const expiredStories = await db.execute<{
      id: string;
      mediaPublicId: string | null;
      mediaResourceType: string | null;
    }>(sql`
      update stories
      set deleted_at = now()
      where deleted_at is null
        and expires_at <= now()
      returning
        id,
        media_public_id as "mediaPublicId",
        media_resource_type as "mediaResourceType"
    `);

    if (!expiredStories.length) {
      return;
    }

    const storyIds = expiredStories.map((story) => story.id);

    io.emit(SOCKET_EVENTS.STORY_EXPIRED, {
      storyIds,
      expiredAt,
    });

    storyIds.forEach((storyId) => {
      io.emit(SOCKET_EVENTS.STORY_DELETED, {
        storyId,
        deletedAt: expiredAt,
      });
    });

    await Promise.allSettled(
      expiredStories.map((story) =>
        deleteMediaAsset(
          story.mediaPublicId,
          story.mediaResourceType,
        ),
      ),
    );
  };

  const timer = setInterval(() => {
    void sweepExpiredStories().catch((error) => {
      console.error("Failed to clean expired stories", error);
    });
  }, STORY_EXPIRATION_SWEEP_MS);

  timer.unref?.();

  void sweepExpiredStories().catch((error) => {
    console.error("Failed to clean expired stories", error);
  });

  return timer;
}

export function setupSocket(server: HttpServer) {
  const previousRequestListeners = server.listeners("request");
  const previousUpgradeListeners = server.listeners("upgrade");

  const io = new Server(server, {
    path: "/socket.io/",
    perMessageDeflate: true,
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
    maxHttpBufferSize: 256 * 1024,
    connectionStateRecovery: {
      maxDisconnectionDuration: 3 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  prioritizeNewListeners(server, "request", previousRequestListeners);
  prioritizeNewListeners(server, "upgrade", previousUpgradeListeners);

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
  startExpiredStoryCleanup(io);

  io.use(async (socket, next) => {
    try {
      const ok = await authenticateSocket(socket);
      if (!ok) {
        next(new Error("Unauthorized"));
        return;
      }
      next();
    } catch (error) {
      console.error("[SOCKET] auth middleware threw", error);
      next(new Error("Service temporarily unavailable"));
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.data.user.id as string;

    debugLog("[SOCKET] connected", {
      socketId: socket.id,
      userId,
      recovered: socket.recovered,
      transport: socket.conn.transport.name,
    });

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

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.warn("[SOCKET] disconnected", {
        socketId: socket.id,
        userId,
        reason,
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
