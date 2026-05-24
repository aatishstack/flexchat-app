export const SOCKET_EVENTS = {
  CONNECT:
    "connect",

  DISCONNECT:
    "disconnect",

  CONNECT_ERROR:
    "connect_error",

  JOIN_CONVERSATION:
    "join_conversation",

  LEAVE_CONVERSATION:
    "leave_conversation",

  SEND_MESSAGE:
    "send_message",

  RECEIVE_MESSAGE:
    "receive_message",

  MESSAGE_UPDATED:
    "message_updated",

  MESSAGE_DELETED:
    "message_deleted",

  MESSAGE_REACTION_UPDATED:
    "message_reaction_updated",

  CONVERSATION_UPDATED:
    "conversation_updated",

  MESSAGE_DELIVERED:
    "message_delivered",

  MESSAGE_SEEN:
    "message_seen",

  MARK_MESSAGE_SEEN:
    "mark_message_seen",

  MARK_MESSAGES_SEEN:
    "mark_messages_seen",

  START_TYPING:
    "start_typing",

  STOP_TYPING:
    "stop_typing",

  TYPING_USERS:
    "typing_users",

  ONLINE_USERS:
    "online_users",

  PRESENCE_UPDATED:
    "presence_updated",

  ACCOUNT_DELETED:
    "account_deleted",

  USER_UPDATED:
    "user_updated",

  DISCOVER_USER_DISMISSED:
    "discover_user_dismissed",

  CONVERSATION_ERROR:
    "conversation_error",

  CONVERSATION_ARCHIVE_UPDATED:
    "conversation_archive_updated",

  CONVERSATION_DELETED:
    "conversation_deleted",

  CONVERSATION_THEME_UPDATED:
    "conversation_theme_updated",

  STORY_CREATED:
    "story_created",

  STORY_VIEWED:
    "story_viewed",

  STORY_DELETED:
    "story_deleted",

  CALL_INVITE:
    "call:initiate",

  CALL_INCOMING:
    "call:incoming",

  CALL_ACCEPT:
    "call:accept",

  CALL_ACCEPTED:
    "call:accepted",

  CALL_REJECT:
    "call:reject",

  CALL_REJECTED:
    "call:rejected",

  CALL_CANCEL:
    "call:cancel",

  CALL_CANCELED:
    "call:canceled",

  CALL_END:
    "call:end",

  // FIX: was "call:end" (collision with CALL_END)
  CALL_ENDED:
    "call:ended",

  // FIX: was "call:answer" (wrong event string)
  CALL_OFFER:
    "call:offer",

  CALL_ANSWER:
    "call:answer",

  CALL_ICE_CANDIDATE:
    "call:ice-candidate",

  CALL_ERROR:
    "call:error",
} as const;
