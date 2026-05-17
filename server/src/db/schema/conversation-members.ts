import {
  index,
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
    },
    (table) => ({
      userConversationIdx: index(
        "conversation_members_user_conversation_idx"
      ).on(
        table.userId,
        table.conversationId
      ),
      conversationUserIdx: index(
        "conversation_members_conversation_user_idx"
      ).on(
        table.conversationId,
        table.userId
      ),
    })
  );
