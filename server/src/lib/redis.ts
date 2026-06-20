import { Redis } from "ioredis";

import { env } from "../config/env.js";

/**
 * A single shared Redis connection used for presence tracking.
 *
 * Redis is OPTIONAL. When REDIS_URL is not configured the app falls back to
 * the in-memory presence adapter and this module exports `null`. When it IS
 * configured, all connection errors are logged but never thrown, so a Redis
 * outage can never crash the process or block presence updates (callers always
 * have an in-memory mirror to fall back on).
 */

let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  if (!env.REDIS_URL) {
    return null;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      // Do not buffer commands forever while disconnected; fail fast so the
      // in-memory mirror stays authoritative during an outage.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      retryStrategy: (times) => Math.min(times * 500, 5_000),
    });

    redisClient.on("error", (error) => {
      console.error("[REDIS] connection error", {
        message: error instanceof Error ? error.message : String(error),
      });
    });

    redisClient.on("connect", () => {
      console.info("[REDIS] connected");
    });

    redisClient.on("reconnecting", () => {
      console.warn("[REDIS] reconnecting");
    });

    return redisClient;
  } catch (error) {
    console.error("[REDIS] failed to initialize client", {
      message: error instanceof Error ? error.message : String(error),
    });
    redisClient = null;
    return null;
  }
}

export function isRedisEnabled(): boolean {
  return Boolean(env.REDIS_URL);
}

/**
 * Build the dedicated pub/sub client pair required by the Socket.IO Redis
 * adapter (the subscriber connection cannot also issue normal commands, so it
 * must be separate from the shared presence client). Returns null when Redis
 * is not configured, in which case the server runs single-instance.
 */
export function createAdapterClients(): { pub: Redis; sub: Redis } | null {
  const base = getRedis();

  if (!base) {
    return null;
  }

  const pub = base.duplicate();
  const sub = base.duplicate();

  pub.on("error", (error) => {
    console.error("[REDIS] adapter pub error", {
      message: error instanceof Error ? error.message : String(error),
    });
  });
  sub.on("error", (error) => {
    console.error("[REDIS] adapter sub error", {
      message: error instanceof Error ? error.message : String(error),
    });
  });

  return { pub, sub };
}

export async function closeRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  } finally {
    redisClient = null;
  }
}
