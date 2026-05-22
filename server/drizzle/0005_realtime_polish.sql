ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;
--> statement-breakpoint
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "shared_theme_id" text;
--> statement-breakpoint
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "theme_updated_by" text;
--> statement-breakpoint
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "theme_updated_at" timestamp;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_user_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL,
  "user_id" text NOT NULL,
  "archived_at" timestamp,
  "hidden_at" timestamp,
  "local_theme_id" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_user_settings_conversation_user_idx"
  ON "conversation_user_settings" ("conversation_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_user_settings_user_archived_idx"
  ON "conversation_user_settings" ("user_id", "archived_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discover_dismissals" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "dismissed_user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "discover_dismissals_user_dismissed_idx"
  ON "discover_dismissals" ("user_id", "dismissed_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discover_dismissals_user_created_at_idx"
  ON "discover_dismissals" ("user_id", "created_at");
