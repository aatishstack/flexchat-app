ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_active_lookup_idx"
  ON "users" ("id", "is_deleted");
