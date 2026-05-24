"use client";

import { Manager, type Socket } from "socket.io-client";

const SOCKET_CONNECT_TIMEOUT_MS = 8_000;
const SOCKET_RECONNECT_INITIAL_DELAY_MS = 1_000;
const SOCKET_RECONNECT_MAX_DELAY_MS = 30_000;

let socket: Socket | null = null;
let manager: Manager | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isIntentionalDisconnect = false;
let backoffMs = SOCKET_RECONNECT_INITIAL_DELAY_MS;

type NetworkInformationLike = EventTarget & {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

function getBackendUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

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

function getNetworkInformation() {
  if (typeof navigator === "undefined") return null;
  return (
    (navigator as Navigator & { connection?: NetworkInformationLike })
      .connection ??
    (navigator as Navigator & { mozConnection?: NetworkInformationLike })
      .mozConnection ??
    (navigator as Navigator & { webkitConnection?: NetworkInformationLike })
      .webkitConnection ??
    null
  );
}

export function getSocketNetworkDiagnostics() {
  const connection = getNetworkInformation();
  if (!connection) {
    return {
      online: typeof navigator === "undefined" ? undefined : navigator.onLine,
    };
  }
  return {
    online: navigator.onLine,
    type: connection.type,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

export function getSocketTransportDiagnostics(
  targetSocket: Socket | null = socket,
) {
  return {
    id: targetSocket?.id,
    connected: Boolean(targetSocket?.connected),
    active: Boolean(targetSocket?.active),
    transport: targetSocket?.io.engine?.transport?.name ?? "none",
    transports: ["websocket"],
    reconnection: false,
    withCredentials: true,
    network: getSocketNetworkDiagnostics(),
  };
}

function clearTimer() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function scheduleReconnect(token: string, delay: number) {
  clearTimer();
  reconnectTimer = setTimeout(() => {
    if (!socket?.connected && !isIntentionalDisconnect) {
      // Only connect if Engine.IO is not already mid-handshake
      if (!socket?.active) {
        configureSocketAuth(socket, token);
        socket?.connect();
      }
    }
  }, delay);
}

function destroySocket() {
  isIntentionalDisconnect = true;
  clearTimer();
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  manager?.removeAllListeners();
  manager = null;
  isIntentionalDisconnect = false;
  backoffMs = SOCKET_RECONNECT_INITIAL_DELAY_MS;
}

export function configureSocketAuth(
  targetSocket: Socket | null,
  token: string | null,
) {
  const nextToken = token?.trim();
  if (!targetSocket || !nextToken) return;
  targetSocket.auth = { token: nextToken };
}

export function getSocket(authToken: string): Socket {
  const token = authToken.trim();

  if (!token) {
    throw new Error("Socket auth token is required");
  }

  // Already connected — just refresh auth and return
  if (socket?.connected) {
    configureSocketAuth(socket, token);
    return socket;
  }

  // Exists but disconnected — reconnect only if Engine.IO is not already attempting
  if (socket && !socket.connected) {
    configureSocketAuth(socket, token);
    if (!socket.active) {
      socket.connect();
    }
    return socket;
  }

  // No socket at all — create fresh manager + socket
  manager = new Manager(getBackendUrl(), {
    transports: ["websocket"],
    rememberUpgrade: false,
    autoConnect: false,
    reconnection: false,
    withCredentials: true,
    timeout: SOCKET_CONNECT_TIMEOUT_MS,
  });

  socket = manager.socket("/", {
    auth: { token },
  });

  socket.on("connect", () => {
    console.info(
      "[Socket] connected, transport:",
      socket?.io.engine.transport.name,
    );
    backoffMs = SOCKET_RECONNECT_INITIAL_DELAY_MS;
    clearTimer();
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] connect_error:", error.message, {
      ...getSocketTransportDiagnostics(socket),
    });
    scheduleReconnect(token, backoffMs);
    backoffMs = Math.min(backoffMs * 2, SOCKET_RECONNECT_MAX_DELAY_MS);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[Socket] disconnect:", reason, {
      ...getSocketTransportDiagnostics(socket),
    });

    if (isIntentionalDisconnect) return;

    if (reason === "io server disconnect") {
      backoffMs = SOCKET_RECONNECT_INITIAL_DELAY_MS;
      scheduleReconnect(token, 2_000);
      return;
    }

    scheduleReconnect(token, backoffMs);
    backoffMs = Math.min(backoffMs * 2, SOCKET_RECONNECT_MAX_DELAY_MS);
  });

  socket.connect();
  return socket;
}

export function getActiveSocket() {
  return socket;
}

export function disconnectSocket() {
  destroySocket();
}

export { socket };

// NOTE: No window online/offline listeners here.
// socket-provider.tsx is the single place that handles network events.
// Having listeners in both places causes double-connect which corrupts
// Engine.IO's internal state machine and causes permanent "connecting" loop.
