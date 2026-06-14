-- Drop redundant index covered by messages_conversation_created_at_id_idx
DROP INDEX IF EXISTS "messages_conversation_created_at_idx";

-- Optimize FCM token lookups by userId
CREATE INDEX IF NOT EXISTS "fcm_tokens_user_id_idx" ON "fcm_tokens" ("user_id");

-- Significantly speed up conversation list unread counts
CREATE INDEX IF NOT EXISTS "messages_unread_partial_idx" ON "messages" ("conversation_id", "sender_id") 
WHERE status <> 'read';
