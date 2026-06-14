import {
  boolean,
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    actorId: text("actor_id"),
    type: text("type").notNull(), // 'missed_call', 'reaction', 'story_reaction', etc.
    entityId: text("entity_id"),
    metadata: text("metadata"), // Stringified JSON for flexibility
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  })
);
