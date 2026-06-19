import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const blocks = pgTable(
  "blocks",
  {
    id: text("id").primaryKey(),

    blockerId: text("blocker_id").notNull(),

    blockedId: text("blocked_id").notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    blockerBlockedIdx: uniqueIndex(
      "blocks_blocker_blocked_idx"
    ).on(table.blockerId, table.blockedId),

    blockedBlockerIdx: index(
      "blocks_blocked_blocker_idx"
    ).on(table.blockedId, table.blockerId),
  })
);
