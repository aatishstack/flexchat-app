ALTER TABLE "stories"
  ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'contacts' NOT NULL;
