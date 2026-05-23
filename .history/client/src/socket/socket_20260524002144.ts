import { io, type Socket } from "socket.io-client";

import { tokenStorage } from "@/lib/token";

const SOCKET_URL =
  "https://flexchat-app-production.up.railway.app";

const globalSocket = globalThis as typeof globalThis & {
  __flexchatSocket?: Socket;
};

export const socket =
  globalSocket.__flexchatSocket ??
  io(SOCKET_URL, {
    autoConnect: true,
    transports: ["polling"],
    upgrade: false,
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 30000,
    auth: {
      token: tokenStorage.get(),
    },
  });

socket.on("connect", () => {
  console.log("Socket connected");
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("reconnect_attempt", () => {
  socket.auth = {
    token: tokenStorage.get(),
  };
});

globalSocket.__flexchatSocket = socket;