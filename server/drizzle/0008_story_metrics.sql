ALTER TABLE "stories"
  ADD COLUMN IF NOT EXISTS "duration_seconds" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
ALTER TABLE "stories"
  ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0 NOT NULL;
