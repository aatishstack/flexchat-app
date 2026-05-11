"use client";

import { create } from "zustand";

import { io, Socket } from "socket.io-client";

interface SocketStore {
  socket: Socket | null;

  isConnected: boolean;

  onlineUsers: string[];

  setOnlineUsers: (
    users: string[]
  ) => void;

  connectSocket: () => void;

  disconnectSocket: () => void;
}

export const useSocketStore =
  create<SocketStore>((set, get) => ({
    socket: null,

    isConnected: false,

    onlineUsers: [],

    setOnlineUsers: (users) =>
      set({
        onlineUsers: users,
      }),

    connectSocket: () => {
      const existingSocket =
        get().socket;

      if (existingSocket?.connected) {
        return;
      }

      const socket = io(
        "http://localhost:5000",
        {
          transports: ["websocket"],
        }
      );

      socket.on("connect", () => {
        console.log("Socket connected");

        set({
          isConnected: true,
        });
      });

      socket.on("disconnect", () => {
        console.log(
          "Socket disconnected"
        );

        set({
          isConnected: false,
        });
      });

      set({
        socket,
      });
    },

    disconnectSocket: () => {
      const socket = get().socket;

      if (socket) {
        socket.disconnect();
      }

      set({
        socket: null,
        isConnected: false,
      });
    },
  }));