ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "reply_to_message_id" text;
--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "reply_to_text" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_reply_source_idx"
  ON "messages" ("reply_to_message_id");
