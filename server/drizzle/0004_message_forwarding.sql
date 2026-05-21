ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "forwarded_from_message_id" text;
--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "forwarded_from_sender_id" text;
--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "forwarded_from_sender_name" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_forwarded_source_idx"
  ON "messages" ("forwarded_from_message_id");
