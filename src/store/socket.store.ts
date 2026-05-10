import { create } from "zustand";
import { io, Socket } from "socket.io-client";

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;

  connect: () => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    if (get().socket) return;

    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected");

      set({
        isConnected: true,
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");

      set({
        isConnected: false,
      });
    });

    set({
      socket,
    });
  },

  disconnect: () => {
    const socket = get().socket;

    socket?.disconnect();

    set({
      socket: null,
      isConnected: false,
    });
  },
}));