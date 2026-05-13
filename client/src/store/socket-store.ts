"use client";

import { create } from "zustand";

import { socket } from "@/socket/socket";

import { SOCKET_EVENTS } from "@/socket/socket-events";

export interface Message {
  id: string;

  text: string;

  senderId: string;

  conversationId: string;

  status:
    | "sending"
    | "sent"
    | "delivered"
    | "read";

  createdAt?: string;

  attachment?: string;

  audio?: string;

  reactions?: {
    emoji: string;

    count: number;
  }[];

  replyTo?: {
    id: string;

    text: string;
  };
}

interface SocketState {
  isConnected: boolean;

  isConnecting: boolean;

  onlineUsers: string[];

  typingUsers: string[];

  messages: Message[];

  connectSocket: (
    token: string
  ) => void;

  disconnectSocket: () => void;

  setOnlineUsers: (
    users: string[]
  ) => void;

  setTypingUsers: (
    users: string[]
  ) => void;

  addMessage: (
    message: Message
  ) => void;

  setMessages: (
    messages: Message[]
  ) => void;

  updateMessageStatus: (
    id: string,

    status:
      | "sent"
      | "delivered"
      | "read"
  ) => void;

  joinConversation: (
    conversationId: string
  ) => void;

  sendMessage: (
    data: {
      conversationId: string;

      text: string;

      attachment?: string | null;

      audio?: string | null;

      replyTo?: {
        id: string;

        text: string;
      };
    }
  ) => void;

  startTyping: (
    conversationId: string
  ) => void;

  stopTyping: (
    conversationId: string
  ) => void;
}

export const useSocketStore =
  create<SocketState>(
    (set) => ({
      isConnected: false,

      isConnecting: false,

      onlineUsers: [],

      typingUsers: [],

      messages: [],

      connectSocket: (
        token
      ) => {
        if (
          socket.connected
        ) {
          return;
        }

        set({
          isConnecting: true,
        });

        socket.auth = {
          token,
        };

        socket.connect();
      },

      disconnectSocket:
        () => {
          socket.disconnect();

          set({
            isConnected: false,
          });
        },

      setOnlineUsers:
        (
          users
        ) =>
          set({
            onlineUsers:
              users,
          }),

      setTypingUsers:
        (
          users
        ) =>
          set({
            typingUsers:
              users,
          }),

      addMessage:
        (
          message
        ) =>
          set(
            (
              state
            ) => ({
              messages:
                [
                  ...state.messages,
                  message,
                ],
            })
          ),

      setMessages:
        (
          messages
        ) =>
          set({
            messages,
          }),

      updateMessageStatus:
        (
          id,
          status
        ) =>
          set(
            (
              state
            ) => ({
              messages:
                state.messages.map(
                  (
                    message
                  ) =>
                    message.id ===
                    id
                      ? {
                          ...message,
                          status,
                        }
                      : message
                ),
            })
          ),

      joinConversation:
        (
          conversationId
        ) => {
          socket.emit(
            SOCKET_EVENTS.JOIN_CONVERSATION,
            {
              conversationId,
            }
          );
        },

      sendMessage:
        (
          data
        ) => {
          const optimisticMessage: Message =
            {
              id:
                crypto.randomUUID(),

              text:
                data.text,

              attachment:
                data.attachment ||
                undefined,

              audio:
                data.audio ||
                undefined,

              reactions: [],

              replyTo:
                data.replyTo ||
                undefined,

              conversationId:
                data.conversationId,

              senderId:
                "me",

              status:
                "sending",

              createdAt:
                new Date().toISOString(),
            };

          set(
            (
              state
            ) => ({
              messages:
                [
                  ...state.messages,
                  optimisticMessage,
                ],
            })
          );

          socket.emit(
            SOCKET_EVENTS.SEND_MESSAGE,
            {
              ...data,

              tempId:
                optimisticMessage.id,
            }
          );
        },

      startTyping:
        (
          conversationId
        ) => {
          socket.emit(
            SOCKET_EVENTS.START_TYPING,
            {
              conversationId,
            }
          );
        },

      stopTyping:
        (
          conversationId
        ) => {
          socket.emit(
            SOCKET_EVENTS.STOP_TYPING,
            {
              conversationId,
            }
          );
        },
    })
  );