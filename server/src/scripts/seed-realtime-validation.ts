import "dotenv/config";

import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { conversationMembers } from "../db/schema/conversation-members.js";
import { conversations } from "../db/schema/conversations.js";
import { messages } from "../db/schema/messages.js";
import { users } from "../db/schema/users.js";

const password = "FlexChatPhase3B!";

const seedUsers = [
  {
    id: "phase3b-user-alice",
    username: "phase3b_alice",
    email: "phase3b.alice@flexchat.local",
  },
  {
    id: "phase3b-user-bob",
    username: "phase3b_bob",
    email: "phase3b.bob@flexchat.local",
  },
] as const;

const seedConversation = {
  id: "phase3b-conversation",
  name: "Phase 3B Validation",
  type: "direct",
};

async function upsertUser(user: (typeof seedUsers)[number]) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (existing.length) {
    await db
      .update(users)
      .set({
        username: user.username,
        email: user.email,
        password: hashedPassword,
      })
      .where(eq(users.id, user.id));

    return;
  }

  await db.insert(users).values({
    ...user,
    password: hashedPassword,
  });
}

async function ensureConversation() {
  const existing = await db
    .select({
      id: conversations.id,
    })
    .from(conversations)
    .where(eq(conversations.id, seedConversation.id))
    .limit(1);

  if (existing.length) {
    await db.execute(sql`
      update conversations
      set name = ${seedConversation.name},
          type = ${seedConversation.type}
      where id = ${seedConversation.id}
    `);

    return;
  }

  await db.insert(conversations).values(seedConversation);
}

async function ensureMemberships() {
  for (const user of seedUsers) {
    const memberId = `${seedConversation.id}:${user.id}`;
    const existing = await db
      .select({
        id: conversationMembers.id,
      })
      .from(conversationMembers)
      .where(eq(conversationMembers.id, memberId))
      .limit(1);

    if (existing.length) {
      continue;
    }

    await db.insert(conversationMembers).values({
      id: memberId,
      conversationId: seedConversation.id,
      userId: user.id,
    });
  }
}

async function main() {
  for (const user of seedUsers) {
    await upsertUser(user);
  }

  await ensureConversation();
  await ensureMemberships();

  await db
    .delete(messages)
    .where(eq(messages.conversationId, seedConversation.id));

  console.log(
    JSON.stringify({
      conversationId: seedConversation.id,
      conversationName: seedConversation.name,
      users: seedUsers.map(({ email, id, username }) => ({
        email,
        id,
        username,
      })),
      password,
    })
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
