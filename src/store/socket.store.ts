import { create } from "zustand";
import { io, Socket } from "socket.io-client";

type SocketStore = {
  socket: Socket | null;
  isConnected: boolean;

  connectSocket: (userId: string) => void;
  disconnectSocket: () => void;
};

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,

  connectSocket: (userId: string) => {
    const existingSocket = get().socket;

    if (existingSocket?.connected) {
      return;
    }

    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected");

      socket.emit("user:join", userId);

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

  disconnectSocket: () => {
    const socket = get().socket;

    socket?.disconnect();

    set({
      socket: null,
      isConnected: false,
    });
  },
}));