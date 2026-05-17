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

  MESSAGE_DELIVERED:
    "message_delivered",

  MESSAGE_SEEN:
    "message_seen",

  MARK_MESSAGE_SEEN:
    "mark_message_seen",

  START_TYPING:
    "start_typing",

  STOP_TYPING:
    "stop_typing",

  TYPING_USERS:
    "typing_users",

  ONLINE_USERS:
    "online_users",
} as const;
