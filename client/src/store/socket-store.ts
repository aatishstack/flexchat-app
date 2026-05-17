"use client";

import { create } from "zustand";

import { socket } from "@/socket/socket";
import { SOCKET_EVENTS } from "@/socket/socket-events";

export type MessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  conversationId: string;
  status: MessageStatus;
  createdAt?: string;
  attachment?: string | null;
  audio?: string | null;
  reactions?: {
    emoji: string;
    count: number;
  }[];
  replyTo?: {
    id: string;
    text: string;
  };
  optimistic?: boolean;
  tempId?: string;
}

interface SendMessageInput {
  conversationId: string;
  text: string;
  attachment?: string | null;
  audio?: string | null;
  replyTo?: {
    id: string;
    text: string;
  };
}

type PendingMessage = SendMessageInput & {
  tempId: string;
  attempts: number;
  inFlight: boolean;
};

type ServerMessageAck = {
  ok: boolean;
  error?: string;
  message?: Message;
  messageId?: string;
  serverId?: string;
  status?: Exclude<MessageStatus, "sending" | "failed">;
};

interface SocketState {
  socket: typeof socket;
  token: string | null;
  activeConversationId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionVersion: number;
  connectionError: string | null;
  onlineUsers: string[];
  typingUsers: string[];
  messages: Message[];
  connectSocket: (token?: string | null) => void;
  disconnectSocket: () => void;
  setOnlineUsers: (users: string[]) => void;
  setTypingUsers: (users: string[]) => void;
  setConnectionError: (message: string | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setConversationMessages: (
    conversationId: string,
    messages: Message[]
  ) => void;
  updateMessageStatus: (
    id: string,
    status: MessageStatus,
    serverId?: string
  ) => void;
  resetPendingMessageFlights: () => void;
  flushPendingMessages: () => void;
  retryMessage: (messageId: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  rejoinActiveConversation: () => void;
  sendMessage: (data: SendMessageInput) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
}

const ACK_TIMEOUT_MS = 9000;
const MAX_RETRY_ATTEMPTS = 3;

const pendingMessages = new Map<
  string,
  PendingMessage
>();

const retryTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();

function clearRetryTimer(tempId: string) {
  const timer = retryTimers.get(tempId);

  if (timer) {
    clearTimeout(timer);
    retryTimers.delete(tempId);
  }
}

function sortMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const left = a.createdAt
      ? new Date(a.createdAt).getTime()
      : 0;
    const right = b.createdAt
      ? new Date(b.createdAt).getTime()
      : 0;

    return left - right;
  });
}

const normalizeMessages = (
  currentMessages: Message[],
  incomingMessage: Message
) => {
  const existingIndex = currentMessages.findIndex(
    (message) =>
      message.id === incomingMessage.id ||
      (!!message.tempId &&
        message.tempId === incomingMessage.id) ||
      (!!incomingMessage.tempId &&
        (message.id === incomingMessage.tempId ||
          message.tempId === incomingMessage.tempId))
  );

  if (existingIndex === -1) {
    return sortMessages([
      ...currentMessages,
      incomingMessage,
    ]);
  }

  return sortMessages(
    currentMessages.map((message, index) =>
      index === existingIndex
        ? {
            ...message,
            ...incomingMessage,
            optimistic: false,
            status:
              incomingMessage.status === "sending"
                ? "sent"
                : incomingMessage.status,
          }
        : message
    )
  );
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket,
  token: null,
  activeConversationId: null,
  isConnected: false,
  isConnecting: false,
  connectionVersion: 0,
  connectionError: null,
  onlineUsers: [],
  typingUsers: [],
  messages: [],

  connectSocket: (token) => {
    const nextToken = token?.trim();

    if (!nextToken) {
      set({
        isConnecting: false,
        connectionError: "Missing socket auth token",
      });

      return;
    }

    const currentToken = get().token;

    if (socket.connected && currentToken === nextToken) {
      set({
        isConnected: true,
        isConnecting: false,
        connectionError: null,
      });

      return;
    }

    if (
      !socket.connected &&
      socket.active &&
      currentToken === nextToken
    ) {
      set({
        isConnecting: true,
        connectionError: null,
      });

      return;
    }

    if (socket.connected && currentToken !== nextToken) {
      socket.disconnect();
    }

    socket.auth = {
      token: nextToken,
    };

    set({
      token: nextToken,
      isConnecting: true,
      connectionError: null,
    });

    socket.connect();
  },

  disconnectSocket: () => {
    socket.disconnect();
    socket.auth = {};
    pendingMessages.clear();
    retryTimers.forEach((timer) =>
      clearTimeout(timer)
    );
    retryTimers.clear();

    set({
      token: null,
      activeConversationId: null,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      onlineUsers: [],
      typingUsers: [],
      messages: [],
    });
  },

  resetPendingMessageFlights: () => {
    pendingMessages.forEach((pending) => {
      pending.inFlight = false;
    });

    retryTimers.forEach((timer) =>
      clearTimeout(timer)
    );
    retryTimers.clear();
  },

  setOnlineUsers: (users) =>
    set({
      onlineUsers: users,
    }),

  setTypingUsers: (users) =>
    set({
      typingUsers: users,
    }),

  setConnectionError: (message) =>
    set({
      connectionError: message,
      isConnecting: false,
    }),

  addMessage: (message) =>
    set((state) => ({
      messages: normalizeMessages(state.messages, message),
    })),

  setMessages: (messages) =>
    set({
      messages: sortMessages(messages),
    }),

  setConversationMessages: (conversationId, messages) =>
    set((state) => ({
      messages: sortMessages([
        ...state.messages.filter(
          (message) => message.conversationId !== conversationId
        ),
        ...messages,
        ...state.messages.filter(
          (message) =>
            message.conversationId === conversationId &&
            (message.status === "sending" ||
              message.status === "failed")
        ),
      ]),
    })),

  updateMessageStatus: (id, status, serverId) =>
    set((state) => ({
      messages: sortMessages(
        state.messages.map((message) =>
          message.id === id ||
          message.id === serverId ||
          message.tempId === id
            ? {
                ...message,
                id: serverId ?? message.id,
                status,
                optimistic:
                  status === "sending" ||
                  status === "failed",
              }
            : message
        )
      ),
    })),

  flushPendingMessages: () => {
    if (!socket.connected) {
      return;
    }

    pendingMessages.forEach((pending) => {
      if (pending.inFlight) {
        return;
      }

      pending.inFlight = true;
      pending.attempts += 1;

      clearRetryTimer(pending.tempId);

      socket
        .timeout(ACK_TIMEOUT_MS)
        .emit(
          SOCKET_EVENTS.SEND_MESSAGE,
          {
            conversationId:
              pending.conversationId,
            text: pending.text,
            attachment:
              pending.attachment ?? null,
            audio: pending.audio ?? null,
            replyTo: pending.replyTo,
            tempId: pending.tempId,
          },
          (
            error: Error | null,
            ack?: ServerMessageAck
          ) => {
            pending.inFlight = false;

            if (error || !ack || !ack.ok) {
              if (
                pending.attempts <
                MAX_RETRY_ATTEMPTS
              ) {
                const timer =
                  setTimeout(() => {
                    get().flushPendingMessages();
                  }, 900 * pending.attempts);

                retryTimers.set(
                  pending.tempId,
                  timer
                );

                return;
              }

              pendingMessages.delete(
                pending.tempId
              );
              clearRetryTimer(
                pending.tempId
              );
              get().updateMessageStatus(
                pending.tempId,
                "failed"
              );
              set({
                connectionError:
                  ack?.error ??
                  error?.message ??
                  "Message failed to send",
              });

              return;
            }

            pendingMessages.delete(
              pending.tempId
            );
            clearRetryTimer(
              pending.tempId
            );

            if (ack.message) {
              get().addMessage({
                ...ack.message,
                tempId: pending.tempId,
                status:
                  ack.message.status ===
                  "sending"
                    ? "sent"
                    : ack.message.status,
              });

              return;
            }

            get().updateMessageStatus(
              ack.messageId ??
                pending.tempId,
              ack.status ?? "sent",
              ack.serverId
            );
          }
        );
    });
  },

  retryMessage: (messageId) => {
    const message = get().messages.find(
      (item) =>
        item.id === messageId ||
        item.tempId === messageId
    );

    if (!message) {
      return;
    }

    const tempId =
      message.tempId ?? message.id;

    pendingMessages.set(tempId, {
      conversationId:
        message.conversationId,
      text: message.text,
      attachment:
        message.attachment ?? null,
      audio: message.audio ?? null,
      replyTo: message.replyTo,
      tempId,
      attempts: 0,
      inFlight: false,
    });

    get().updateMessageStatus(
      message.id,
      "sending"
    );
    get().flushPendingMessages();
  },

  joinConversation: (conversationId) => {
    set({
      activeConversationId: conversationId,
    });

    if (!socket.connected) {
      return;
    }

    socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, {
      conversationId,
    });
  },

  leaveConversation: (conversationId) => {
    if (get().activeConversationId === conversationId) {
      set({
        activeConversationId: null,
        typingUsers: [],
      });
    }

    if (!socket.connected) {
      return;
    }

    socket.emit(SOCKET_EVENTS.STOP_TYPING, {
      conversationId,
    });

    socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, {
      conversationId,
    });
  },

  rejoinActiveConversation: () => {
    const conversationId = get().activeConversationId;

    if (!conversationId || !socket.connected) {
      return;
    }

    socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, {
      conversationId,
    });
  },

  sendMessage: (data) => {
    const text = data.text.trim();

    if (!text && !data.attachment && !data.audio) {
      return;
    }

    const tempId = crypto.randomUUID();

    const optimisticMessage: Message = {
      id: tempId,
      text,
      attachment: data.attachment ?? null,
      audio: data.audio ?? null,
      reactions: [],
      replyTo: data.replyTo,
      conversationId: data.conversationId,
      senderId: "me",
      status: "sending",
      optimistic: true,
      createdAt: new Date().toISOString(),
    };

    pendingMessages.set(tempId, {
      ...data,
      text,
      tempId,
      attempts: 0,
      inFlight: false,
    });

    set((state) => ({
      messages: sortMessages([
        ...state.messages,
        optimisticMessage,
      ]),
    }));

    get().flushPendingMessages();
  },

  startTyping: (conversationId) => {
    if (!socket.connected) {
      return;
    }

    socket.emit(SOCKET_EVENTS.START_TYPING, {
      conversationId,
    });
  },

  stopTyping: (conversationId) => {
    if (!socket.connected) {
      return;
    }

    socket.emit(SOCKET_EVENTS.STOP_TYPING, {
      conversationId,
    });
  },
}));
