import { io, type Socket } from "socket.io-client";

import { tokenStorage } from "@/lib/token";
import { useSocketStore } from "@/store/socket-store";

function resolveSocketUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
  }

  return "https://flexchat-app-production.up.railway.app";
}

const globalSocket = globalThis as typeof globalThis & {
  __flexchatSocket?: Socket;
};

function createSocket(): Socket {
  const token = tokenStorage.get();

  return io(resolveSocketUrl(), {
    path: "/socket.io/",
    autoConnect: false,

    transports: ["websocket", "polling"],

    upgrade: true,
    rememberUpgrade: false,
    tryAllTransports: true,

    forceNew: false,

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.4,

    timeout: 15000,

    withCredentials: false,

    auth: token
      ? {
          token,
        }
      : {},

    query: token
      ? {
          token,
        }
      : {},
  });
}

export const socket: Socket =
  globalSocket.__flexchatSocket ??
  (() => {
    const createdSocket = createSocket();

    globalSocket.__flexchatSocket = createdSocket;

    createdSocket.io.on("reconnect_attempt", () => {
      const token = tokenStorage.get();

      createdSocket.auth = token
        ? {
            token,
          }
        : {};

      createdSocket.io.opts.query = token
        ? {
            token,
          }
        : {};
    });

    createdSocket.on("connect", () => {
      console.info("[FlexChat Socket] connected", {
        id: createdSocket.id,
        transport: createdSocket.io.engine?.transport?.name,
      });
    });

    createdSocket.on("disconnect", (reason) => {
      console.warn("[FlexChat Socket] disconnected", reason);
    });

    createdSocket.on("connect_error", (error) => {
      console.error("[FlexChat Socket] connect_error", error.message);
    });

    return createdSocket;
  })();

export function getSocket() {
  return useSocketStore.getState().socket;
}

export function getActiveSocket() {
  const activeSocket = useSocketStore.getState().socket;

  if (!activeSocket || !activeSocket.connected) {
    return null;
  }

  return activeSocket;
}

export function getSocketTransportDiagnostics(targetSocket?: Socket | null) {
  const activeSocket = targetSocket ?? useSocketStore.getState().socket;

  if (!activeSocket) {
    return {
      connected: false,
      transport: "none",
    };
  }

  return {
    connected: activeSocket.connected,
    id: activeSocket.id,
    transport: activeSocket.io.engine?.transport?.name ?? "unknown",
  };
}

export function getSocketNetworkDiagnostics() {
  if (typeof navigator === "undefined") {
    return {
      online: false,
    };
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
      };
    }
  ).connection;

  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType ?? "unknown",
    downlink: connection?.downlink ?? null,
    rtt: connection?.rtt ?? null,
  };
}
