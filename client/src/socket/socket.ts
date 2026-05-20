import {
  io,
  type Socket,
} from "socket.io-client";

import { resolveLocalRuntimeUrl } from "@/lib/runtime-url";

const SOCKET_URL =
  resolveLocalRuntimeUrl(
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
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

globalSocket.__flexchatSocket = socket;
