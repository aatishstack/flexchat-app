import {
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const users =
  pgTable("users", {
    id: integer("id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    username: text(
      "username"
    ).notNull(),

    email: text(
      "email"
    ).notNull(),

    password: text(
      "password"
    ).notNull(),

    avatar: text(
      "avatar"
    ),

    createdAt: timestamp(
      "created_at"
    ).defaultNow(),
  });

export const conversations =
  pgTable(
    "conversations",
    {
      id: integer("id")
        .primaryKey()
        .generatedAlwaysAsIdentity(),

      title: text(
        "title"
      ),

      createdAt: timestamp(
        "created_at"
      ).defaultNow(),
    }
  );

export const conversationMembers =
  pgTable(
    "conversation_members",
    {
      id: integer("id")
        .primaryKey()
        .generatedAlwaysAsIdentity(),

      conversationId:
        integer(
          "conversation_id"
        ),

      userId: integer(
        "user_id"
      ),
    }
  );

export const messages =
  pgTable("messages", {
    id: integer("id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),

    conversationId:
      integer(
        "conversation_id"
      ),

    senderId:
      integer(
        "sender_id"
      ),

    content: text(
      "content"
    ),

    type: text("type")
      .default("text"),

    createdAt: timestamp(
      "created_at"
    ).defaultNow(),
  });