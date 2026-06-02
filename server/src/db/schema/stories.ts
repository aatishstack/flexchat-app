import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const stories = pgTable(
  "stories",
  {
    id: text("id").primaryKey(),

    userId: text("user_id").notNull(),

    mediaUrl: text("media_url").notNull(),

    mediaType: text("media_type").notNull(),

    durationSeconds:
      integer("duration_seconds")
        .default(5)
        .notNull(),

    viewCount:
      integer("view_count")
        .default(0)
        .notNull(),

    caption: text("caption"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    expiresAt: timestamp("expires_at").notNull(),

    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userCreatedAtIdx: index(
      "stories_user_created_at_idx"
    ).on(table.userId, table.createdAt),
    activeExpiresAtIdx: index(
      "stories_active_expires_at_idx"
    ).on(table.expiresAt, table.deletedAt),
  })
);

export const storyViews = pgTable(
  "story_views",
  {
    id: text("id").primaryKey(),

    storyId: text("story_id").notNull(),

    userId: text("user_id").notNull(),

    viewedAt: timestamp("viewed_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    storyUserUniqueIdx: uniqueIndex(
      "story_views_story_user_unique_idx"
    ).on(table.storyId, table.userId),
    userViewedAtIdx: index(
      "story_views_user_viewed_at_idx"
    ).on(table.userId, table.viewedAt),
  })
);
