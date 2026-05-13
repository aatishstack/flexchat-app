import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const messages =
  pgTable(
    "messages",
    {
      id: text("id")
        .primaryKey(),

      conversationId:
        text(
          "conversation_id"
        ).notNull(),

      senderId:
        text(
          "sender_id"
        ).notNull(),

      text:
        text("text")
          .notNull(),

      attachment:
        text("attachment"),

      audio:
        text("audio"),

      status:
        text("status")
          .default(
            "sent"
          )
          .notNull(),

      createdAt:
        timestamp(
          "created_at"
        )
          .defaultNow()
          .notNull(),
    }
  );