"use client";

import { create } from "zustand";

import { generateId } from "@/lib/uuid";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { getServerNow } from "@/lib/server-time";

import {
  mergeMessageIntoQueryCache,
  updateMessageStatusInQueryCache,
} from "@/lib/message-query-cache";

import type { MessageQueryCache } from "@/lib/message-query-cache";

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

  type?: "text" | "image" | "video" | "file";

  mediaId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;

  createdAt?: string;
  editedAt?: string;
  deletedAt?: string;

  attachment?: string | null;
  audio?: string | null;

  reactions?: {
    emoji: string;
    count: number;
  }[];

  forwardedFrom?: {
    messageId: string;
    senderId?: string | null;
    senderName?: string | null;
  };

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

  type?: "text" | "image" | "video" | "file";

  mediaId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;

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
  createdAt: number;
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

  messagesByConversation: Record<string, Message[]>;

  connectSocket: (token?: string | null) => void;

  disconnectSocket: () => void;

  recoverSocketConnection: (reason?: string) => void;

  setOnlineUsers: (users: string[]) => void;

  setTypingUsers: (users: string[]) => void;

  setConnectionError: (message: string | null) => void;

  addMessage: (message: Message) => void;

  updateMessageStatus: (
    id: string,
    status: MessageStatus,
    serverId?: string,
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

const pendingMessages = new Map<string, PendingMessage>();

const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function sortMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;

    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return left - right;
  });
}

function normalizeMessages(
  currentMessages: Message[],
  incomingMessage: Message,
) {
  const exists = currentMessages.some(
    (message) => message.id === incomingMessage.id,
  );

  if (exists) {
    return currentMessages;
  }

  return sortMessages([...currentMessages, incomingMessage]);
}

function normalizeMessageBuckets(
  buckets: Record<string, Message[]>,
  incomingMessage: Message,
) {
  return {
    ...buckets,

    [incomingMessage.conversationId]: normalizeMessages(
      buckets[incomingMessage.conversationId] ?? [],
      incomingMessage,
    ),
  };
}

function setCachedConversationMessage(
  conversationId: string,
  message: Message,
) {
  queryClient.setQueryData<MessageQueryCache>(
    queryKeys.messages.list(conversationId),

    (cache) => mergeMessageIntoQueryCache(cache, message),
  );
}

function setCachedMessageStatus(
  id: string,
  status: MessageStatus,
  serverId?: string,
) {
  queryClient.setQueriesData<MessageQueryCache>(
    {
      queryKey: ["messages"],
    },

    (cache) =>
      updateMessageStatusInQueryCache(
        cache,
        {
          messageId: id,
          serverId,
          status,
        },
        status,
      ),
  );
}

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

  messagesByConversation: {},

  connectSocket: (token) => {
    const nextToken = token?.trim();

    if (!nextToken) {
      socket.disconnect();

      socket.auth = {};

      set({
        token: null,
        isConnected: false,
        isConnecting: false,
        connectionError: "Missing auth token",
      });

      return;
    }

    if (socket.connected && get().token === nextToken) {
      set({
        isConnected: true,
        isConnecting: false,
        connectionError: null,
      });

      return;
    }

    if (socket.connected || socket.active) {
      socket.disconnect();
    }

    socket.auth = {
      token: nextToken,
    };

    socket.io.opts.transports = ["websocket", "polling"];

    socket.io.opts.query = {
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

    retryTimers.forEach((timer) => clearTimeout(timer));

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
      messagesByConversation: {},
    });
  },

  recoverSocketConnection: (reason = "manual-recovery") => {
    console.info("[FlexChat Socket] recover", reason);

    if (socket.connected) {
      return;
    }

    if (socket.active) {
      return;
    }

    socket.connect();

    set({
      isConnecting: true,
      connectionError: null,
    });
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

      messagesByConversation: normalizeMessageBuckets(
        state.messagesByConversation,
        message,
      ),
    })),

  updateMessageStatus: (id, status, serverId) => {
    setCachedMessageStatus(id, status, serverId);

    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id
          ? {
              ...message,
              id: serverId ?? message.id,
              status,
            }
          : message,
      ),
    }));
  },

  resetPendingMessageFlights: () => {
    pendingMessages.forEach((pending) => {
      pending.inFlight = false;
    });
  },

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

      socket.timeout(ACK_TIMEOUT_MS).emit(
        SOCKET_EVENTS.SEND_MESSAGE,
        {
          conversationId: pending.conversationId,

          text: pending.text,

          type: pending.type,

          mediaId: pending.mediaId ?? null,

          fileName: pending.fileName ?? null,

          fileSize: pending.fileSize ?? null,

          mimeType: pending.mimeType ?? null,

          attachment: pending.attachment ?? null,

          audio: pending.audio ?? null,

          replyTo: pending.replyTo,

          tempId: pending.tempId,
        },

        (error: Error | null, ack?: ServerMessageAck) => {
          pending.inFlight = false;

          if (error || !ack || !ack.ok) {
            return;
          }

          pendingMessages.delete(pending.tempId);

          if (ack.message) {
            get().addMessage(ack.message);

            setCachedConversationMessage(pending.conversationId, ack.message);

            return;
          }

          get().updateMessageStatus(
            ack.messageId ?? pending.tempId,
            ack.status ?? "sent",
            ack.serverId,
          );
        },
      );
    });
  },

  retryMessage: (messageId) => {
    const message = get().messages.find(
      (item) => item.id === messageId || item.tempId === messageId,
    );

    if (!message) {
      return;
    }

    pendingMessages.set(
      message.tempId ?? message.id,

      {
        conversationId: message.conversationId,

        text: message.text,

        type: message.type,

        mediaId: message.mediaId ?? null,

        fileName: message.fileName ?? null,

        fileSize: message.fileSize ?? null,

        mimeType: message.mimeType ?? null,

        attachment: message.attachment ?? null,

        audio: message.audio ?? null,

        replyTo: message.replyTo,

        tempId: message.tempId ?? message.id,

        attempts: 0,

        inFlight: false,

        createdAt: Date.now(),
      },
    );

    get().updateMessageStatus(message.id, "sending");

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

    if (!text && !data.attachment && !data.audio && !data.mediaId) {
      return;
    }

    const tempId = generateId();

    const optimisticMessage: Message = {
      id: tempId,

      tempId,

      text,

      type: data.type,

      mediaId: data.mediaId ?? null,

      fileName: data.fileName ?? null,

      fileSize: data.fileSize ?? null,

      mimeType: data.mimeType ?? null,

      attachment: data.attachment ?? null,

      audio: data.audio ?? null,

      conversationId: data.conversationId,

      senderId: "me",

      status: "sending",

      optimistic: true,

      createdAt: new Date(getServerNow()).toISOString(),
    };

    pendingMessages.set(tempId, {
      ...data,

      text,

      tempId,

      attempts: 0,

      inFlight: false,

      createdAt: Date.now(),
    });

    set((state) => ({
      messages: sortMessages([...state.messages, optimisticMessage]),

      messagesByConversation: normalizeMessageBuckets(
        state.messagesByConversation,
        optimisticMessage,
      ),
    }));

    setCachedConversationMessage(data.conversationId, optimisticMessage);

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
