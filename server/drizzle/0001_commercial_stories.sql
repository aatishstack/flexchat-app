CREATE TABLE IF NOT EXISTS "stories" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "media_url" text NOT NULL,
  "media_type" text NOT NULL,
  "caption" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "deleted_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_user_created_at_idx"
  ON "stories" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_active_expires_at_idx"
  ON "stories" ("expires_at", "deleted_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_views" (
  "id" text PRIMARY KEY NOT NULL,
  "story_id" text NOT NULL,
  "user_id" text NOT NULL,
  "viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "story_views_story_user_unique_idx"
  ON "story_views" ("story_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_views_user_viewed_at_idx"
  ON "story_views" ("user_id", "viewed_at");
