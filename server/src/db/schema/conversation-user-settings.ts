import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const conversationUserSettings = pgTable(
  "conversation_user_settings",
  {
    id: text("id").primaryKey(),

    conversationId: text("conversation_id").notNull(),

    userId: text("user_id").notNull(),

    archivedAt: timestamp("archived_at"),

    hiddenAt: timestamp("hidden_at"),

    localThemeId: text("local_theme_id"),

    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    conversationUserUniqueIdx: uniqueIndex(
      "conversation_user_settings_conversation_user_idx",
    ).on(table.conversationId, table.userId),
    userArchivedIdx: index(
      "conversation_user_settings_user_archived_idx",
    ).on(table.userId, table.archivedAt),
  }),
);
