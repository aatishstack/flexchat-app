import { and, eq, or, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import { blocks } from "../db/schema/blocks.js";
import { conversations } from "../db/schema/conversations.js";
import { conversationMembers } from "../db/schema/conversation-members.js";

/**
 * Checks if there is a block relationship between userA and userB.
 * Returns true if either user has blocked the other.
 */
export async function isBlocked(userA: string, userB: string): Promise<boolean> {
  if (!userA || !userB || userA === userB) {
    return false;
  }

  const result = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, userA), eq(blocks.blockedId, userB)),
        and(eq(blocks.blockerId, userB), eq(blocks.blockedId, userA))
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Checks if a conversation is blocked for a user.
 * For direct conversations, it is blocked if either member has blocked the other.
 * Group conversations are not blocked.
 */
export async function isConversationBlocked(
  userId: string,
  conversationId: string
): Promise<boolean> {
  if (!userId || !conversationId) {
    return false;
  }

  // 1. Get the conversation type
  const convoResult = await db
    .select({ type: conversations.type })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (convoResult.length === 0) {
    return false;
  }

  // Only direct conversations can be blocked
  if (convoResult[0].type !== "direct") {
    return false;
  }

  // 2. Get the other member of the direct conversation
  const membersResult = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        ne(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  if (membersResult.length === 0) {
    return false;
  }

  const otherUserId = membersResult[0].userId;

  // 3. Check if either user has blocked the other
  return isBlocked(userId, otherUserId);
}
