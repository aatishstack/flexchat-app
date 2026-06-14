CREATE TABLE IF NOT EXISTS "fcm_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"device_type" text DEFAULT 'web' NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fcm_tokens_token_unique" UNIQUE("token")
);
