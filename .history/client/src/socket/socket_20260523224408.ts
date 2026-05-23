import {
  io,
  type Socket,
} from "socket.io-client";

const SOCKET_URL =
  "https://flexchat-app-production.up.railway.app";

const globalSocket = globalThis as typeof globalThis & {
  __flexchatSocket?: Socket;
};

export const socket =
  globalSocket.__flexchatSocket ??
  io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket"],
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

globalSocket.__flexchatSocket = socket;