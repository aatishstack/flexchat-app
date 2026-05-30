ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone_number" text;
--> statement-breakpoint
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone_number_normalized" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_number_normalized_unique_idx"
  ON "users" ("phone_number_normalized")
  WHERE "phone_number_normalized" IS NOT NULL;
