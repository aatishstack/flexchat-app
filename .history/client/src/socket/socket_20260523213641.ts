import {
  io,
  type Socket,
} from "socket.io-client";

import { resolveLocalRuntimeUrl } from "@/lib/runtime-url";

const SOCKET_URL = resolveLocalRuntimeUrl(
  process.env.NEXT_PUBLIC_SOCKET_URL,
  "https://flexchat-app-production.up.railway.app"
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
    timeout: 10000,
  });

globalSocket.__flexchatSocket = socket;