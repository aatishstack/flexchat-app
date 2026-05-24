"use client";

export interface Message {
  id: string;

  text: string;

  senderId: string;

  conversationId: string;

  status: "sending" | "sent" | "delivered" | "read" | "failed";

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

import { create } from "zustand";

import { socket } from "@/socket/socket";

interface SocketState {
  socket: typeof socket;

  token: string | null;

  isConnected: boolean;

  isConnecting: boolean;

  connectionError: string | null;

  activeConversationId: string | null;

  onlineUsers: string[];

  typingUsers: string[];

  messages: unknown[];

  messagesByConversation: Record<string, unknown[]>;

  connectSocket: (token?: string | null) => void;

  disconnectSocket: () => void;

  recoverSocketConnection: (reason?: string) => void;

  setOnlineUsers: (users: string[]) => void;

  setTypingUsers: (users: string[]) => void;

  setConnectionError: (message: string | null) => void;

  addMessage: (message: unknown) => void;

  updateMessageStatus: (id: string, status: string, serverId?: string) => void;

  resetPendingMessageFlights: () => void;

  flushPendingMessages: () => void;

  retryMessage: (messageId: string) => void;

  joinConversation: (conversationId: string) => void;

  leaveConversation: (conversationId: string) => void;

  rejoinActiveConversation: () => void;

  sendMessage: (data: unknown) => void;

  startTyping: (conversationId: string) => void;

  stopTyping: (conversationId: string) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket,

  token: null,

  isConnected: false,

  isConnecting: false,

  connectionError: null,

  activeConversationId: null,

  onlineUsers: [],

  typingUsers: [],

 messages: Message[];

messagesByConversation: Record<
  string,
  Message[]


  connectSocket: (token) => {
    if (!token) {
      return;
    }

    socket.auth = {
      token,
    };

    if (!socket.connected) {
      socket.connect();
    }

    set({
      token,
      isConnecting: true,
      connectionError: null,
    });
  },

  disconnectSocket: () => {
    socket.disconnect();

    set({
      token: null,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
    });
  },

  recoverSocketConnection: (reason = "manual-recovery") => {
    console.info("[Socket Recover]", reason);

    if (socket.connected) {
      return;
    }

    socket.connect();

    set({
      isConnecting: true,
      connectionError: null,
    });
  },

  setOnlineUsers: (users) => {
    set({
      onlineUsers: users,
    });
  },

  setTypingUsers: (users) => {
    set({
      typingUsers: users,
    });
  },

  setConnectionError: (message) => {
    set({
      connectionError: message,
    });
  },

  addMessage: () => {},

  updateMessageStatus: () => {},

  resetPendingMessageFlights: () => {},

  flushPendingMessages: () => {},

  retryMessage: () => {},

  joinConversation: (conversationId) => {
    set({
      activeConversationId: conversationId,
    });
  },

  leaveConversation: () => {
    set({
      activeConversationId: null,
    });
  },

  rejoinActiveConversation: () => {},

  sendMessage: () => {},

  startTyping: () => {},

  stopTyping: () => {},
}));
