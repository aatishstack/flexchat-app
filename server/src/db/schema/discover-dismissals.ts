import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const discoverDismissals = pgTable(
  "discover_dismissals",
  {
    id: text("id").primaryKey(),

    userId: text("user_id").notNull(),

    dismissedUserId: text("dismissed_user_id").notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userDismissedUniqueIdx: uniqueIndex(
      "discover_dismissals_user_dismissed_idx",
    ).on(table.userId, table.dismissedUserId),
    userCreatedAtIdx: index(
      "discover_dismissals_user_created_at_idx",
    ).on(table.userId, table.createdAt),
  }),
);
