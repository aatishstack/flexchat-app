import { io, type Socket } from "socket.io-client";

import { tokenStorage } from "@/lib/token";

const SOCKET_URL = "https://flexchat-app-production.up.railway.app";

const globalSocket = globalThis as typeof globalThis & {
  __flexchatSocket?: Socket;
};

export const socket =
  globalSocket.__flexchatSocket ??
  io(SOCKET_URL, {
    path: "/socket.io/",
    autoConnect: true,
    transports: ["polling"],
    upgrade: false,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 30000,
    withCredentials: false,
    auth: {
      token: tokenStorage.get(),
    },
    query: {
      token: tokenStorage.get(),
    },
  });

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.log("Socket error:", error.message);
});

socket.on("reconnect_attempt", () => {
  const token = tokenStorage.get();

  socket.auth = {
    token,
  };

  socket.io.opts.query = {
    token,
  };
});

globalSocket.__flexchatSocket = socket;
