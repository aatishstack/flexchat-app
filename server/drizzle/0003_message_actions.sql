ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "attachment" text;
--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "audio" text;
--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "edited_at" timestamp;
--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_deleted_idx"
  ON "messages" ("conversation_id", "deleted_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id" text PRIMARY KEY NOT NULL,
  "message_id" text NOT NULL,
  "conversation_id" text NOT NULL,
  "user_id" text NOT NULL,
  "emoji" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_message_user_unique_idx"
  ON "message_reactions" ("message_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reactions_message_emoji_idx"
  ON "message_reactions" ("message_id", "emoji");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reactions_conversation_idx"
  ON "message_reactions" ("conversation_id");
