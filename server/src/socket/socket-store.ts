import { getRedis, isRedisEnabled } from "../lib/redis.js";


export interface PresenceAdapter {
  addSocket: (
    userId: string,
    socketId: string
  ) => void;
  touchSocket: (
    socketId: string
  ) => void;
  removeSocket: (
    socketId: string
  ) => string | null;
  removeMissingSockets: (
    activeSocketIds: Set<string>
  ) => string[];
  getOnlineUserIds: () => string[];
  getLastSeenByUserId: (userId: string) => number | null;
}

type SocketPresence = {
  userId: string;
  connectedAt: number;
  lastSeenAt: number;
};

class InMemoryPresenceAdapter
  implements PresenceAdapter
{
  private readonly onlineUsers = new Map<
    string,
    Set<string>
  >();

  private readonly socketUsers = new Map<
    string,
    SocketPresence
  >();

  private readonly lastSeenByUser = new Map<
    string,
    number
  >();

  addSocket(
    userId: string,
    socketId: string
  ) {
    const now = Date.now();
    const sockets =
      this.onlineUsers.get(userId) ??
      new Set<string>();

    sockets.add(socketId);
    this.onlineUsers.set(userId, sockets);
    this.socketUsers.set(socketId, {
      userId,
      connectedAt: now,
      lastSeenAt: now,
    });
  }

  touchSocket(socketId: string) {
    const socketPresence =
      this.socketUsers.get(socketId);

    if (!socketPresence) {
      return;
    }

    socketPresence.lastSeenAt = Date.now();
  }

  removeSocket(socketId: string) {
    const socketPresence =
      this.socketUsers.get(socketId);

    if (!socketPresence) {
      return null;
    }

    const { userId } = socketPresence;
    const sockets =
      this.onlineUsers.get(userId);

    sockets?.delete(socketId);

    if (!sockets?.size) {
      this.onlineUsers.delete(userId);
      this.lastSeenByUser.set(userId, Date.now());
    }

    this.socketUsers.delete(socketId);

    return userId;
  }

  removeMissingSockets(
    activeSocketIds: Set<string>
  ) {
    const changedUserIds =
      new Set<string>();

    Array.from(this.socketUsers.keys()).forEach(
      (socketId) => {
        if (activeSocketIds.has(socketId)) {
          return;
        }

        const userId =
          this.removeSocket(socketId);

        if (userId) {
          changedUserIds.add(userId);
        }
      }
    );

    return Array.from(changedUserIds);
  }

  getOnlineUserIds() {
    return Array.from(this.onlineUsers.keys());
  }

  getTrackedSocketIds() {
    return Array.from(this.socketUsers.keys());
  }

  getLastSeenByUserId(userId: string) {
    return this.lastSeenByUser.get(userId) ?? null;
  }
}

/**
 * Redis-backed presence adapter.
 *
 * Design goals (Railway restart-safe, multi-tab, multi-device):
 *  - Synchronous reads: keeps a local in-memory mirror so getOnlineUserIds()
 *    stays synchronous (no change to existing call sites) and remains correct
 *    even if Redis is briefly unavailable.
 *  - Durable write-through to Redis using the agreed key shape:
 *      presence:user:{userId}  -> SET of active socketIds (multi-tab/device)
 *      lastSeen:user:{userId}  -> last-seen epoch ms (survives restarts)
 *  - All Redis operations are best-effort: a failure logs and degrades to the
 *    in-memory mirror; it never throws into the socket lifecycle.
 *
 * Online status is rebuilt from live reconnections after a restart, and the
 * existing 30s removeMissingSockets sweep reconciles any sockets that died
 * while the process was down.
 */
class RedisPresenceAdapter implements PresenceAdapter {
  private readonly mirror = new InMemoryPresenceAdapter();

  private static presenceKey(userId: string) {
    return `presence:user:${userId}`;
  }

  private static lastSeenKey(userId: string) {
    return `lastSeen:user:${userId}`;
  }

  private safeRedis() {
    try {
      return getRedis();
    } catch {
      return null;
    }
  }

  addSocket(userId: string, socketId: string) {
    this.mirror.addSocket(userId, socketId);

    const redis = this.safeRedis();

    if (!redis) {
      return;
    }

    void redis
      .sadd(RedisPresenceAdapter.presenceKey(userId), socketId)
      .catch((error: unknown) => {
        console.error("[REDIS] addSocket failed", {
          userId,
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }

  touchSocket(socketId: string) {
    this.mirror.touchSocket(socketId);
  }

  removeSocket(socketId: string) {
    const userId = this.mirror.removeSocket(socketId);

    if (!userId) {
      return null;
    }

    const redis = this.safeRedis();

    if (!redis) {
      return userId;
    }

    const stillOnline = this.mirror
      .getOnlineUserIds()
      .includes(userId);
    const lastSeenAt = Date.now();

    void (async () => {
      try {
        await redis.srem(
          RedisPresenceAdapter.presenceKey(userId),
          socketId,
        );

        if (!stillOnline) {
          await redis.set(
            RedisPresenceAdapter.lastSeenKey(userId),
            String(lastSeenAt),
          );
        }
      } catch (error) {
        console.error("[REDIS] removeSocket failed", {
          userId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return userId;
  }

  removeMissingSockets(activeSocketIds: Set<string>) {
    // The mirror knows every socket this instance is tracking; reconcile
    // against the live socket set, mirroring the removals into Redis.
    const changedUserIds = this.mirror.getTrackedSocketIds();
    const removedUsers = new Set<string>();

    changedUserIds.forEach((socketId) => {
      if (activeSocketIds.has(socketId)) {
        return;
      }

      const userId = this.removeSocket(socketId);

      if (userId) {
        removedUsers.add(userId);
      }
    });

    return Array.from(removedUsers);
  }

  getOnlineUserIds() {
    return this.mirror.getOnlineUserIds();
  }

  getLastSeenByUserId(userId: string) {
    return this.mirror.getLastSeenByUserId(userId);
  }
}

const presenceAdapter: PresenceAdapter =
  isRedisEnabled()
    ? new RedisPresenceAdapter()
    : new InMemoryPresenceAdapter();

export function addOnlineSocket(
  userId: string,
  socketId: string
) {
  presenceAdapter.addSocket(userId, socketId);
}

export function touchOnlineSocket(
  socketId: string
) {
  presenceAdapter.touchSocket(socketId);
}

export function removeOnlineSocket(
  socketId: string
) {
  return presenceAdapter.removeSocket(socketId);
}

export function removeMissingOnlineSockets(
  activeSocketIds: Set<string>
) {
  return presenceAdapter.removeMissingSockets(
    activeSocketIds
  );
}

export function getOnlineUserIds() {
  return presenceAdapter.getOnlineUserIds();
}

export function getLastSeenByUserId(userId: string) {
  return presenceAdapter.getLastSeenByUserId(userId);
}
