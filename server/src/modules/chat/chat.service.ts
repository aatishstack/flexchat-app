import { eq } from "drizzle-orm";

import { db }
  from "../../db/index.js";

import {
  conversations,
  conversationMembers,
  messages,
} from "../../db/schema.js";

export async function createConversation(
  currentUserId: string,
  targetUserId: string
) {
  const newConversation =
    await db
      .insert(conversations)
      .values({
        isGroup: false,
      })
      .returning();

  const conversationId =
    newConversation[0].id;

  await db
    .insert(conversationMembers)
    .values([
      {
        conversationId,
        userId: currentUserId,
      },

      {
        conversationId,
        userId: targetUserId,
      },
    ]);

  return newConversation[0];
}

export async function createMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  const newMessage =
    await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content,
      })
      .returning();

  return newMessage[0];
}

export async function getMessages(
  conversationId: string
) {
  return await db
    .select()
    .from(messages)
    .where(
      eq(
        messages.conversationId,
        conversationId
      )
    );
}