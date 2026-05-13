export const SOCKET_EVENTS = {
  CONNECT:
    "connect",

  DISCONNECT:
    "disconnect",

  JOIN_CONVERSATION:
    "join_conversation",

  SEND_MESSAGE:
    "send_message",

  RECEIVE_MESSAGE:
    "receive_message",

  START_TYPING:
    "start_typing",

  STOP_TYPING:
    "stop_typing",

  TYPING_USERS:
    "typing_users",

  ONLINE_USERS:
    "online_users",
} as const;