import { getRedis } from "../lib/redis.js";


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
 * Local per-instance presence mirror. The Redis-backed global functions below
 * are the cross-instance source of truth; this mirror provides synchronous
 * reads and a fallback when Redis is unavailable.
 */
const presenceAdapter = new InMemoryPresenceAdapter();

// --- Local (per-instance) presence mirror -------------------------------
// Synchronous reads used internally and as the fallback when Redis is off.

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

// --- Global (cross-instance) presence via Redis -------------------------
// Redis is the source of truth across Railway replicas:
//   presence:user:{userId}  -> SET of active socketIds (all instances)
//   presence:online         -> SET of currently-online userIds
//   lastSeen:user:{userId}   -> last-seen epoch ms
// All Redis ops are best-effort; on failure we degrade to the local mirror.

function presenceUserKey(userId: string) {
  return `presence:user:${userId}`;
}

const PRESENCE_ONLINE_KEY = "presence:online";

function lastSeenKey(userId: string) {
  return `lastSeen:user:${userId}`;
}

export type PresenceDisconnectResult = {
  userId: string;
  online: boolean;
};

/** Register a socket as online (local mirror + global Redis sets). */
export async function presenceConnect(
  userId: string,
  socketId: string,
): Promise<void> {
  presenceAdapter.addSocket(userId, socketId);

  const redis = getRedis();

  if (!redis) {
    return;
  }

  try {
    await redis
      .multi()
      .sadd(presenceUserKey(userId), socketId)
      .sadd(PRESENCE_ONLINE_KEY, userId)
      .exec();
  } catch (error) {
    console.error("[REDIS] presenceConnect failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Remove a socket and report whether the user is still online GLOBALLY (i.e.
 * has sockets on any instance). When the user becomes fully offline, their
 * Redis online flag is cleared and last-seen recorded.
 */
export async function presenceDisconnect(
  socketId: string,
): Promise<PresenceDisconnectResult | null> {
  const userId = presenceAdapter.removeSocket(socketId);

  if (!userId) {
    return null;
  }

  const redis = getRedis();

  if (!redis) {
    return {
      userId,
      online: presenceAdapter.getOnlineUserIds().includes(userId),
    };
  }

  try {
    await redis.srem(presenceUserKey(userId), socketId);
    const remaining = await redis.scard(presenceUserKey(userId));
    const online = remaining > 0;

    if (!online) {
      await redis
        .multi()
        .srem(PRESENCE_ONLINE_KEY, userId)
        .set(lastSeenKey(userId), String(Date.now()))
        .exec();
    }

    return { userId, online };
  } catch (error) {
    console.error("[REDIS] presenceDisconnect failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      userId,
      online: presenceAdapter.getOnlineUserIds().includes(userId),
    };
  }
}

/**
 * Reconcile this instance's tracked sockets against the live socket set
 * (backstop sweep). Returns the users whose presence changed and their final
 * global online state.
 */
export async function presenceReconcile(
  activeSocketIds: Set<string>,
): Promise<PresenceDisconnectResult[]> {
  const staleSocketIds = presenceAdapter
    .getTrackedSocketIds()
    .filter((socketId) => !activeSocketIds.has(socketId));

  const byUser = new Map<string, boolean>();

  for (const socketId of staleSocketIds) {
    const result = await presenceDisconnect(socketId);

    if (!result) {
      continue;
    }

    // Offline (false) wins over any earlier online reading for the same user.
    const previous = byUser.get(result.userId);
    byUser.set(
      result.userId,
      previous === undefined ? result.online : previous && result.online,
    );
  }

  return Array.from(byUser.entries()).map(([userId, online]) => ({
    userId,
    online,
  }));
}

/** Globally online user ids (Redis when available, else local mirror). */
export async function getOnlineUserIdsAsync(): Promise<string[]> {
  const redis = getRedis();

  if (redis) {
    try {
      return await redis.smembers(PRESENCE_ONLINE_KEY);
    } catch (error) {
      console.error("[REDIS] getOnlineUserIdsAsync failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return presenceAdapter.getOnlineUserIds();
}

/** Whether a user has any active socket on any instance. */
export async function isUserOnlineAsync(userId: string): Promise<boolean> {
  const redis = getRedis();

  if (redis) {
    try {
      return (await redis.scard(presenceUserKey(userId))) > 0;
    } catch (error) {
      console.error("[REDIS] isUserOnlineAsync failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return presenceAdapter.getOnlineUserIds().includes(userId);
}
