import {
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const conversationMembers =
  pgTable(
    "conversation_members",
    {
      id: text("id")
        .primaryKey(),

      conversationId:
        text(
          "conversation_id"
        ).notNull(),

      userId:
        text(
          "user_id"
        ).notNull(),
    }
  );