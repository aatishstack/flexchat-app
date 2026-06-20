import type { Server as HttpServer } from "http";

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { sql } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { debugLog } from "../lib/debug-log.js";
import { createAdapterClients } from "../lib/redis.js";
import { deleteMediaAsset } from "../services/media.service.js";
import { authenticateSocket } from "./socket-auth.js";
import { SOCKET_EVENTS } from "./socket-events.js";
import {
  getOnlineUserIds,
  getOnlineUserIdsAsync,
  presenceConnect,
  presenceDisconnect,
  presenceReconcile,
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

  // Multi-instance fan-out: when Redis is configured, attach the Socket.IO
  // Redis adapter so room emits (messages, typing) and broadcasts (presence
  // deltas) propagate across all Railway replicas. Without Redis the server
  // runs single-instance with identical behavior.
  const adapterClients = createAdapterClients();
  const multiInstance = Boolean(adapterClients);

  if (adapterClients) {
    io.adapter(createAdapter(adapterClients.pub, adapterClients.sub));
    console.info("[SOCKET] Redis adapter enabled (multi-instance mode)");
  }

  setSocketServer(io);

  const presenceCleanupTimer = setInterval(() => {
    void (async () => {
      const previousOnlineUsers = getOnlineUserIds().join(",");

      const changed = await presenceReconcile(
        new Set(io.sockets.sockets.keys()),
      );

      if (!changed.length) {
        return;
      }

      // Single-instance: keep the legacy full-list broadcast as a self-heal.
      // Multi-instance: the per-connect snapshot + presence deltas keep every
      // client accurate (a full-list broadcast would only reflect one node).
      if (!multiInstance) {
        const nextOnlineUsers = getOnlineUserIds();

        if (previousOnlineUsers !== nextOnlineUsers.join(",")) {
          io.emit(SOCKET_EVENTS.ONLINE_USERS, nextOnlineUsers);
        }
      }

      changed.forEach(({ userId, online }) => {
        if (online) {
          return;
        }

        const lastSeenAt = Date.now();
        const lastSeenIso = new Date(lastSeenAt).toISOString();

        void db
          .execute(
            sql`
            update users
            set last_seen_at = ${lastSeenIso}
            where id = ${userId}
              and is_deleted = false
          `,
          )
          .catch((error) => {
            console.error("Failed to persist cleaned-up last seen", error);
          });

        io.emit(SOCKET_EVENTS.PRESENCE_UPDATED, {
          userId,
          status: "offline",
          lastSeenAt,
        });
      });
    })().catch((error) => {
      console.error("Presence cleanup sweep failed", error);
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

    socket.join(`user:${userId}`);

    socket.onAny(() => {
      touchOnlineSocket(socket.id);
    });

    void (async () => {
      const previousOnlineUsers = getOnlineUserIds().join(",");

      await presenceConnect(userId, socket.id);

      // Always bootstrap the connecting socket with the authoritative (global
      // when Redis is on) online snapshot — covers multi-tab, refresh and
      // reconnect where the global set did not otherwise change.
      socket.emit(
        SOCKET_EVENTS.ONLINE_USERS,
        await getOnlineUserIdsAsync(),
      );

      // Single-instance self-heal broadcast (skipped in multi-instance mode,
      // where presence deltas + per-connect snapshots are authoritative).
      if (!multiInstance) {
        const nextOnlineUsers = getOnlineUserIds();

        if (previousOnlineUsers !== nextOnlineUsers.join(",")) {
          io.emit(SOCKET_EVENTS.ONLINE_USERS, nextOnlineUsers);
        }
      }

      // Presence delta — propagated to all instances by the Redis adapter.
      io.emit(SOCKET_EVENTS.PRESENCE_UPDATED, {
        userId,
        status: "online",
        lastSeenAt: Date.now(),
      });
    })().catch((error) => {
      console.error("Presence connect failed", error);
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

      void (async () => {
        const previousOnlineUsers = getOnlineUserIds().join(",");

        const result = await presenceDisconnect(socket.id);

        if (!multiInstance) {
          const nextOnlineUsers = getOnlineUserIds();

          if (previousOnlineUsers !== nextOnlineUsers.join(",")) {
            io.emit(SOCKET_EVENTS.ONLINE_USERS, nextOnlineUsers);
          }
        }

        if (result && !result.online) {
          const lastSeenAt = Date.now();
          const lastSeenIso = new Date(lastSeenAt).toISOString();

          void db
            .execute(
              sql`
                update users
                set last_seen_at = ${lastSeenIso}
                where id = ${result.userId}
                  and is_deleted = false
              `,
            )
            .catch((error) => {
              console.error("Failed to persist last seen", error);
            });

          io.emit(SOCKET_EVENTS.PRESENCE_UPDATED, {
            userId: result.userId,
            status: "offline",
            lastSeenAt,
          });
        }
      })().catch((error) => {
        console.error("Presence disconnect failed", error);
      });
    });
  });

  return io;
}
