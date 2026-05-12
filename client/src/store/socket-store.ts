"use client";

import { create } from "zustand";

import {
  io,
  Socket,
} from "socket.io-client";

type SocketStore = {
  socket: Socket | null;

  connected: boolean;

  connectSocket: (
    token: string
  ) => void;

  disconnectSocket: () => void;
};

export const useSocketStore =
  create<SocketStore>((set, get) => ({

    socket: null,

    connected: false,

    connectSocket: (token) => {

      const existingSocket =
        get().socket;

      if (
        existingSocket?.connected
      ) {
        return;
      }

      const socket = io(
        "http://localhost:5000",
        {
          auth: {
            token,
          },

          transports: [
            "websocket",
          ],

          reconnection: true,

          reconnectionAttempts: 10,

          reconnectionDelay: 1000,
        }
      );

      socket.on(
        "connect",
        () => {

          console.log(
            "Socket connected"
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

      set({
        socket,
      });
    },

    disconnectSocket: () => {

      const socket =
        get().socket;

      socket?.disconnect();

      set({
        socket: null,

        connected: false,
      });
    },
  }));