import {
  index,
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
    },
    (table) => ({
      conversationCreatedAtIdx: index(
        "messages_conversation_created_at_idx"
      ).on(
        table.conversationId,
        table.createdAt
      ),
      conversationCreatedAtIdIdx: index(
        "messages_conversation_created_at_id_idx"
      ).on(
        table.conversationId,
        table.createdAt,
        table.id
      ),
      conversationStatusIdx: index(
        "messages_conversation_status_idx"
      ).on(
        table.conversationId,
        table.status
      ),
      conversationUnreadIdx: index(
        "messages_conversation_unread_idx"
      ).on(
        table.conversationId,
        table.status,
        table.senderId
      ),
    })
  );
