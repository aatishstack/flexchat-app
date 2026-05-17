import {
  and,
  eq,
  inArray,
} from "drizzle-orm";

import { db } from "../db/index.js";
import { conversationMembers } from "../db/schema/conversation-members.js";

const ACCESS_CACHE_TTL_MS = 30_000;

type AccessCacheEntry = {
  allowed: boolean;
  expiresAt: number;
};

const accessCache = new Map<string, AccessCacheEntry>();

function accessCacheKey(
  userId: string,
  conversationId: string
) {
  return `${userId}:${conversationId}`;
}

export async function isConversationMember(
  userId: string,
  conversationId: string
) {
  const key = accessCacheKey(userId, conversationId);
  const cached = accessCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.allowed;
  }

  const rows = await db
    .select({
      id: conversationMembers.id,
    })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.userId, userId),
        eq(
          conversationMembers.conversationId,
          conversationId
        )
      )
    )
    .limit(1);

  const allowed = rows.length > 0;

  accessCache.set(key, {
    allowed,
    expiresAt: now + ACCESS_CACHE_TTL_MS,
  });

  return allowed;
}

export async function getUserConversationIds(
  userId: string
) {
  const rows = await db
    .select({
      conversationId:
        conversationMembers.conversationId,
    })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  return rows.map((row) => row.conversationId);
}

export async function getConversationMembers(
  conversationIds: string[]
) {
  if (!conversationIds.length) {
    return [];
  }

  return db
    .select()
    .from(conversationMembers)
    .where(
      inArray(
        conversationMembers.conversationId,
        conversationIds
      )
    );
}
