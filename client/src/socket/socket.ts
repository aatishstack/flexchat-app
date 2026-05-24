import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "@/lib/token";

function resolveSocketUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (configured) return configured;
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
  }
  return "https://flexchat-app-production.up.railway.app";
}

declare global {
  // eslint-disable-next-line no-var
  var __flexchatSocket: Socket | undefined;
}

function buildSocket(): Socket {
  const token = tokenStorage.get();
  const instance = io(resolveSocketUrl(), {
    path: "/socket.io/",
    autoConnect: false,
    transports: ["websocket", "polling"],
    upgrade: true,
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.45,
    timeout: 20_000,
    withCredentials: false,
    auth: token ? { token } : {},
    query: token ? { token } : {},
  });

  instance.io.on("reconnect_attempt", () => {
    const latestToken = tokenStorage.get();
    instance.auth = latestToken ? { token: latestToken } : {};
    instance.io.opts.query = latestToken ? { token: latestToken } : {};
  });

  return instance;
}

export const socket: Socket =
  globalThis.__flexchatSocket ??
  (() => {
    const s = buildSocket();
    globalThis.__flexchatSocket = s;
    return s;
  })();
