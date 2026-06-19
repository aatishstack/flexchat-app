CREATE TABLE IF NOT EXISTS "blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_members" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"archived_at" timestamp,
	"hidden_at" timestamp,
	"local_theme_id" text,
	"pinned_at" timestamp,
	"muted_at" timestamp,
	"folder" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discover_dismissals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"dismissed_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fcm_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"device_type" text DEFAULT 'web' NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fcm_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_assets" (
	"public_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"client_upload_id" text,
	"purpose" text NOT NULL,
	"secure_url" text NOT NULL,
	"delivery_url" text NOT NULL,
	"resource_type" text NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_name" text NOT NULL,
	"bytes" integer NOT NULL,
	"format" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"attached_at" timestamp,
	"delete_requested_at" timestamp,
	"deleted_at" timestamp
);
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
CREATE TABLE IF NOT EXISTS "message_user_hidden" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"hidden_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text NOT NULL,
	"entity_id" text,
	"metadata" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"device_id" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_url" text NOT NULL,
	"media_public_id" text,
	"media_secure_url" text,
	"media_resource_type" text,
	"media_type" text NOT NULL,
	"visibility" text DEFAULT 'contacts' NOT NULL,
	"duration_seconds" integer DEFAULT 5 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_views" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"user_id" text NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" RENAME COLUMN "title" TO "name";--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "type" SET DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'sent';--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "avatar_public_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "avatar_secure_url" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "avatar_resource_type" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "shared_theme_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "theme_updated_by" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "theme_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "audio" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_public_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_secure_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_resource_type" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_kind" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_mime_type" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_file_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "media_bytes" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "forwarded_from_message_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "forwarded_from_sender_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "forwarded_from_sender_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_to_message_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_to_text" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_public_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_secure_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_resource_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number_normalized" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blocks_blocker_blocked_idx" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocks_blocked_blocker_idx" ON "blocks" USING btree ("blocked_id","blocker_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_members_user_conversation_idx" ON "conversation_members" USING btree ("user_id","conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_members_conversation_user_idx" ON "conversation_members" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_user_settings_conversation_user_idx" ON "conversation_user_settings" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_user_settings_user_archived_idx" ON "conversation_user_settings" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "discover_dismissals_user_dismissed_idx" ON "discover_dismissals" USING btree ("user_id","dismissed_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discover_dismissals_user_created_at_idx" ON "discover_dismissals" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fcm_tokens_user_id_idx" ON "fcm_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_owner_created_at_idx" ON "media_assets" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_cleanup_idx" ON "media_assets" USING btree ("deleted_at","delete_requested_at","attached_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_owner_client_upload_idx" ON "media_assets" USING btree ("owner_user_id","client_upload_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_message_user_unique_idx" ON "message_reactions" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reactions_message_emoji_idx" ON "message_reactions" USING btree ("message_id","emoji");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_reactions_conversation_idx" ON "message_reactions" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_user_hidden_message_user_unique_idx" ON "message_user_hidden" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_user_hidden_conversation_user_idx" ON "message_user_hidden" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_user_created_at_idx" ON "stories" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_active_expires_at_idx" ON "stories" USING btree ("expires_at","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "story_views_story_user_unique_idx" ON "story_views" USING btree ("story_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_views_user_viewed_at_idx" ON "story_views" USING btree ("user_id","viewed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_created_at_id_idx" ON "messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_status_idx" ON "messages" USING btree ("conversation_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_unread_idx" ON "messages" USING btree ("conversation_id","status","sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_deleted_idx" ON "messages" USING btree ("conversation_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_forwarded_source_idx" ON "messages" USING btree ("forwarded_from_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_reply_source_idx" ON "messages" USING btree ("reply_to_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_unread_partial_idx" ON "messages" USING btree ("conversation_id","sender_id") WHERE status <> 'read';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_normalized_unique" UNIQUE("phone_number_normalized");