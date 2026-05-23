import {
  io,
  type Socket,
} from "socket.io-client";

import { resolveLocalRuntimeUrl } from "@/lib/runtime-url";

const SOCKET_URL =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  !window.location.hostname.includes("localhost")
    ? window.location.origin
    : resolveLocalRuntimeUrl(
        process.env.NEXT_PUBLIC_SOCKET_URL,
        "http://localhost:5000"
      );

const globalSocket = globalThis as typeof globalThis & {
  __flexchatSocket?: Socket;
};

export const socket =
  globalSocket.__flexchatSocket ??
  io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: false,
    timeout: 10000,
  });

globalSocket.__flexchatSocket = socket;

let reconnectDelay = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

socket.on("connect", () => {
  reconnectDelay = 1000;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
});

socket.on("disconnect", () => {
  if (reconnectTimer || !socket.auth || !("token" in socket.auth)) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    socket.connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 30000);
});
