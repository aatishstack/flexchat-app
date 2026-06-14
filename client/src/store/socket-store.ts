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
import { tokenStorage } from "@/lib/token";
import {
  refreshSocketAuth,
  socket,
} from "@/socket/socket";
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
const MAX_RETRY_ATTEMPTS = 3;
const MAX_EPHEMERAL_MESSAGES_PER_CONVERSATION = 160;
const MAX_PENDING_MESSAGES = 80;
const PENDING_MESSAGE_TTL_MS = 5 * 60 * 1000;
const TYPING_THROTTLE_MS = 3500;

const pendingMessages = new Map<string, PendingMessage>();
const lastTypingSentAt = new Map<string, number>();

const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearRetryTimer(tempId: string) {
  const timer = retryTimers.get(tempId);

  if (timer) {
    clearTimeout(timer);
    retryTimers.delete(tempId);
  }
}

function failPendingMessage(
  tempId: string,
  updateMessageStatus: (id: string, status: MessageStatus) => void,
) {
  pendingMessages.delete(tempId);
  clearRetryTimer(tempId);
  updateMessageStatus(tempId, "failed");
}

function prunePendingMessages(
  updateMessageStatus: (id: string, status: MessageStatus) => void,
) {
  const now = Date.now();

  pendingMessages.forEach((pending, tempId) => {
    if (now - pending.createdAt > PENDING_MESSAGE_TTL_MS) {
      failPendingMessage(tempId, updateMessageStatus);
    }
  });

  while (pendingMessages.size > MAX_PENDING_MESSAGES) {
    const oldest = Array.from(pendingMessages.values()).sort(
      (left, right) => left.createdAt - right.createdAt,
    )[0];

    if (!oldest) {
      return;
    }

    failPendingMessage(oldest.tempId, updateMessageStatus);
  }
}

function sortMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return left - right;
  });
}

function trimEphemeralMessages(messages: Message[]) {
  const byConversation = new Map<string, Message[]>();

  messages.forEach((message) => {
    const conversationMessages =
      byConversation.get(message.conversationId) ?? [];

    conversationMessages.push(message);
    byConversation.set(message.conversationId, conversationMessages);
  });

  return Array.from(byConversation.values()).flatMap((conversationMessages) =>
    sortMessages(conversationMessages).slice(
      -MAX_EPHEMERAL_MESSAGES_PER_CONVERSATION,
    ),
  );
}

function arraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

const normalizeMessages = (
  currentMessages: Message[],
  incomingMessage: Message,
) => {
  const existingIndex = currentMessages.findIndex(
    (message) =>
      message.id === incomingMessage.id ||
      (!!message.tempId && message.tempId === incomingMessage.id) ||
      (!!incomingMessage.tempId &&
        (message.id === incomingMessage.tempId ||
          message.tempId === incomingMessage.tempId)),
  );

  if (existingIndex === -1) {
    return trimEphemeralMessages(
      sortMessages([...currentMessages, incomingMessage]),
    );
  }

  return trimEphemeralMessages(
    sortMessages(
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
          : message,
      ),
    ),
  );
};

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

function updateMessageStatusInList(
  messages: Message[] | undefined,
  id: string,
  status: MessageStatus,
  serverId?: string,
) {
  if (!messages) {
    return messages;
  }

  let changed = false;

  const nextMessages = messages.map((message) => {
    const matches =
      message.id === id || message.id === serverId || message.tempId === id;

    if (!matches) {
      return message;
    }

    changed = true;

    return {
      ...message,
      id: serverId ?? message.id,
      status,
      optimistic: status === "sending" || status === "failed",
    };
  });

  return changed ? sortMessages(nextMessages) : messages;
}

function updateMessageStatusBuckets(
  buckets: Record<string, Message[]>,
  id: string,
  status: MessageStatus,
  serverId?: string,
) {
  let changed = false;
  const nextBuckets: Record<string, Message[]> = {};

  Object.entries(buckets).forEach(([conversationId, messages]) => {
    const nextMessages =
      updateMessageStatusInList(messages, id, status, serverId) ?? [];

    if (nextMessages !== messages) {
      changed = true;
      nextBuckets[conversationId] = trimEphemeralMessages(nextMessages);
      return;
    }

    nextBuckets[conversationId] = messages;
  });

  return changed ? nextBuckets : buckets;
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
    const nextToken = token?.trim() || tokenStorage.get()?.trim();

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

    const currentToken = get().token;

    if (
      (socket.connected || socket.active) &&
      currentToken === nextToken
    ) {
      refreshSocketAuth("connect_reuse");
      set({
        isConnected: socket.connected,
        isConnecting: socket.active && !socket.connected,
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
    socket.io.opts.withCredentials = false;

    console.info("[SOCKET] connecting", {
      hasToken: true,
      alreadyConnected: socket.connected,
      active: socket.active,
    });

    set({
      token: nextToken,
      isConnecting: true,
      connectionError: null,
    });

    socket.connect();
  },

  disconnectSocket: () => {
    console.info("[SOCKET] disconnect requested", {
      connected: socket.connected,
      active: socket.active,
    });
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

  resetPendingMessageFlights: () => {
    pendingMessages.forEach((pending) => {
      pending.inFlight = false;
    });

    retryTimers.forEach((timer) => clearTimeout(timer));
    retryTimers.clear();
  },

  setOnlineUsers: (users) => {
    const nextUsers = Array.from(new Set(users)).sort();

    if (arraysEqual(get().onlineUsers, nextUsers)) {
      return;
    }

    set({
      onlineUsers: nextUsers,
    });
  },

  setTypingUsers: (users) => {
    const nextUsers = Array.from(new Set(users)).sort();

    if (arraysEqual(get().typingUsers, nextUsers)) {
      return;
    }

    set({
      typingUsers: nextUsers,
    });
  },

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
      messages: trimEphemeralMessages(
        updateMessageStatusInList(state.messages, id, status, serverId) ?? [],
      ),
      messagesByConversation: updateMessageStatusBuckets(
        state.messagesByConversation,
        id,
        status,
        serverId,
      ),
    }));
  },

  flushPendingMessages: () => {
    prunePendingMessages(get().updateMessageStatus);

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
            if (pending.attempts < MAX_RETRY_ATTEMPTS) {
              const timer = setTimeout(() => {
                get().flushPendingMessages();
              }, 900 * pending.attempts);

              retryTimers.set(pending.tempId, timer);

              return;
            }

            pendingMessages.delete(pending.tempId);
            clearRetryTimer(pending.tempId);
            get().updateMessageStatus(pending.tempId, "failed");
            set({
              connectionError:
                ack?.error ?? error?.message ?? "Message failed to send",
            });

            return;
          }

          pendingMessages.delete(pending.tempId);
          clearRetryTimer(pending.tempId);

          if (ack.message) {
            setCachedConversationMessage(pending.conversationId, {
              ...ack.message,
              tempId: pending.tempId,
              status:
                ack.message.status === "sending" ? "sent" : ack.message.status,
            });

            get().addMessage({
              ...ack.message,
              tempId: pending.tempId,
              status:
                ack.message.status === "sending" ? "sent" : ack.message.status,
            });

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

    const tempId = message.tempId ?? message.id;

    pendingMessages.set(tempId, {
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
      tempId,
      attempts: 0,
      inFlight: false,
      createdAt: Date.now(),
    });

    get().updateMessageStatus(message.id, "sending");
    get().flushPendingMessages();
  },

  joinConversation: (conversationId) => {
    const previousConversationId = get().activeConversationId;

    if (
      previousConversationId &&
      previousConversationId !== conversationId &&
      socket.connected
    ) {
      socket.emit(SOCKET_EVENTS.STOP_TYPING, {
        conversationId: previousConversationId,
      });

      socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, {
        conversationId: previousConversationId,
      });
    }

    set({
      activeConversationId: conversationId,
      typingUsers:
        previousConversationId === conversationId ? get().typingUsers : [],
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

    console.info("[SOCKET] rejoining active conversation", {
      conversationId,
    });
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
      reactions: [],
      replyTo: data.replyTo,
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

    prunePendingMessages(get().updateMessageStatus);

    set((state) => {
      const conversationMessages = state.messagesByConversation[data.conversationId] ?? [];
      
      return {
        messages: trimEphemeralMessages([...state.messages, optimisticMessage]),
        messagesByConversation: {
          ...state.messagesByConversation,
          [data.conversationId]: trimEphemeralMessages([
            ...conversationMessages,
            optimisticMessage,
          ]),
        },
      };
    });

    setCachedConversationMessage(data.conversationId, optimisticMessage);

    get().flushPendingMessages();
  },

  startTyping: (conversationId) => {
    if (!socket.connected) {
      return;
    }

    const now = Date.now();
    const lastSent = lastTypingSentAt.get(conversationId) ?? 0;

    if (now - lastSent < TYPING_THROTTLE_MS) {
      return;
    }

    lastTypingSentAt.set(conversationId, now);

    socket.emit(SOCKET_EVENTS.START_TYPING, {
      conversationId,
    });
  },

  stopTyping: (conversationId) => {
    if (!socket.connected) {
      return;
    }

    lastTypingSentAt.delete(conversationId);

    socket.emit(SOCKET_EVENTS.STOP_TYPING, {
      conversationId,
    });
  },
}));
