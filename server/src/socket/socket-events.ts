export const SOCKET_EVENTS = {
  CONNECTION:
    "connection",

  CONNECT:
    "connect",

  DISCONNECT:
    "disconnect",

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

  ACCOUNT_DELETED:
    "account_deleted",

  CONVERSATION_ERROR:
    "conversation_error",

  STORY_CREATED:
    "story_created",

  STORY_VIEWED:
    "story_viewed",

  STORY_DELETED:
    "story_deleted",

  CALL_INVITE:
    "call_invite",

  CALL_INCOMING:
    "call_incoming",

  CALL_ACCEPT:
    "call_accept",

  CALL_ACCEPTED:
    "call_accepted",

  CALL_REJECT:
    "call_reject",

  CALL_REJECTED:
    "call_rejected",

  CALL_CANCEL:
    "call_cancel",

  CALL_CANCELED:
    "call_canceled",

  CALL_END:
    "call_end",

  CALL_ENDED:
    "call_ended",

  CALL_SIGNAL:
    "call_signal",

  CALL_SIGNAL_RELAY:
    "call_signal_relay",

  CALL_ERROR:
    "call_error",
} as const;
