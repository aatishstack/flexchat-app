import { io, type Socket } from "socket.io-client";

import { tokenStorage } from "@/lib/token";

const SOCKET_URL = "https://flexchat-app-production.up.railway.app";

const globalSocket = globalThis as typeof globalThis & {
  __flexchatSocket?: Socket;
};

export const socket =
  globalSocket.__flexchatSocket ??
  io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 20000,
    auth: {
      token: tokenStorage.get(),
    },
  });

socket.on("reconnect_attempt", () => {
  socket.auth = {
    token: tokenStorage.get(),
  };
});

globalSocket.__flexchatSocket = socket;
