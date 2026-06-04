ALTER TABLE "conversation_user_settings"
  ADD COLUMN IF NOT EXISTS "pinned_at" timestamp;
--> statement-breakpoint
ALTER TABLE "conversation_user_settings"
  ADD COLUMN IF NOT EXISTS "muted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "conversation_user_settings"
  ADD COLUMN IF NOT EXISTS "folder" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_user_settings_user_pinned_idx"
  ON "conversation_user_settings" ("user_id", "pinned_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_user_settings_user_folder_idx"
  ON "conversation_user_settings" ("user_id", "folder");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_user_hidden" (
  "id" text PRIMARY KEY NOT NULL,
  "message_id" text NOT NULL,
  "conversation_id" text NOT NULL,
  "user_id" text NOT NULL,
  "hidden_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_user_hidden_message_user_unique_idx"
  ON "message_user_hidden" ("message_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_user_hidden_conversation_user_idx"
  ON "message_user_hidden" ("conversation_id", "user_id");
