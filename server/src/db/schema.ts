import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id")
    .defaultRandom()
    .primaryKey(),

  username: text("username")
    .notNull()
    .unique(),

  email: text("email")
    .notNull()
    .unique(),

  password: text("password")
    .notNull(),

  avatar: text("avatar"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});

export const conversations =
  pgTable("conversations", {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    isGroup: boolean("is_group")
      .default(false),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  });

export const conversationMembers =
  pgTable("conversation_members", {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    conversationId: uuid(
      "conversation_id"
    ).notNull(),

    userId: uuid("user_id")
      .notNull(),

    joinedAt: timestamp("joined_at")
      .defaultNow()
      .notNull(),
  });

export const messages = pgTable(
  "messages",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    conversationId: uuid(
      "conversation_id"
    ).notNull(),

    senderId: uuid("sender_id")
      .notNull(),

    content: text("content")
      .notNull(),

    createdAt: timestamp(
      "created_at"
    )
      .defaultNow()
      .notNull(),
  }
);