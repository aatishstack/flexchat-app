import { io, type Socket } from "socket.io-client";

import { tokenStorage } from "@/lib/token";

function resolveSocketUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000";
  }

  return "https://flexchat-app-production.up.railway.app";
}

const globalSocket =
  globalThis as typeof globalThis & {
    __flexchatSocket?: Socket;
  };

export const socket =
  globalSocket.__flexchatSocket ??
  io(resolveSocketUrl(), {
    path: "/socket.io/",
    autoConnect: false,
    transports: [
      "websocket",
      "polling",
    ],
    upgrade: true,
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 30000,
    withCredentials: false,
    auth: {
      token:
        tokenStorage.get(),
    },
    query: {
      token:
        tokenStorage.get(),
    },
  });

socket.on("connect", () => {
  console.log(
    "Socket connected:",
    socket.id,
  );
});

socket.on(
  "connect_error",
  (error) => {
    console.log(
      "Socket error:",
      error.message,
    );
  },
);

socket.on(
  "disconnect",
  (reason) => {
    console.log(
      "Socket disconnected:",
      reason,
    );
  },
);

socket.on(
  "reconnect_attempt",
  () => {
    const token =
      tokenStorage.get();

    socket.auth = {
      token,
    };

    socket.io.opts.query = {
      token,
    };
  },
);

globalSocket.__flexchatSocket =
  socket;
