"use client";

import { create } from "zustand";

import { io, Socket } from "socket.io-client";

type Message = {
  id: string;

  conversationId: string;

  senderId: string;

  text?: string;

  createdAt: string;
};

type ChatStore = {
  socket: Socket | null;

  connected: boolean;

  messages: Message[];

  connectSocket: (
    userId: string
  ) => void;

  disconnectSocket: () => void;

  sendMessage: (
    data: {
      conversationId: string;

      senderId: string;

      text: string;
    }
  ) => void;

  addMessage: (
    message: Message
  ) => void;
};

export const useChatStore =
  create<ChatStore>(
    (set, get) => ({
      socket: null,

      connected: false,

      messages: [],

      connectSocket: (
        userId
      ) => {
        if (get().socket) return;

        const socket = io(
          "http://localhost:5000",
          {
            auth: {
              userId,
            },

            transports: [
              "websocket",
            ],
          }
        );

        socket.on(
          "connect",
          () => {
            console.log(
              "Socket connected"
            );

            socket.emit(
              "join_conversation",
              "global-room"
            );

            set({
              connected: true,
            });
          }
        );

        socket.on(
          "disconnect",
          () => {
            console.log(
              "Socket disconnected"
            );

            set({
              connected: false,
            });
          }
        );

        socket.on(
          "receive_message",
          (message) => {
            console.log(
              "Received:",
              message
            );

            get().addMessage(
              message
            );
          }
        );

        set({
          socket,
        });
      },

      disconnectSocket: () => {
        get().socket?.disconnect();

        set({
          socket: null,

          connected: false,
        });
      },

      addMessage: (
        message
      ) => {
        set({
          messages: [
            ...get().messages,

            message,
          ],
        });
      },

      sendMessage: (
        data
      ) => {
        console.log(
          "Sending:",
          data
        );

        get().socket?.emit(
          "send_message",
          data
        );
      },
    })
  );