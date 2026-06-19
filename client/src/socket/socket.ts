import { io, type Socket } from "socket.io-client";
import { tokenStorage } from "@/lib/token";
import { resolveLocalRuntimeUrl } from "@/lib/runtime-url";

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function isLocalUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    return isLocalHost(new URL(value).hostname);
  } catch {
    return false;
  }
}

function resolveSocketUrl(): string {
  const configuredSocketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const configuredBackendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    const localFallback = `http://${hostname}:5000`;

    const isMobileApp = typeof window !== "undefined" &&
      ((window as any).Capacitor || (window as any).webkit?.messageHandlers?.cordova);

    if (isLocalHost(hostname) && !isMobileApp) {
      if (isLocalUrl(configuredBackendUrl)) {
        return resolveLocalRuntimeUrl(
          configuredBackendUrl,
          localFallback,
        );
      }

      if (configuredSocketUrl) {
        return resolveLocalRuntimeUrl(
          configuredSocketUrl,
          localFallback,
        );
      }

      return localFallback;
    }
  }

  if (configuredSocketUrl) return configuredSocketUrl;
  if (configuredBackendUrl) return configuredBackendUrl;

  return "https://flexchat-app-production.up.railway.app";
}

function attachSocketAuth(instance: Socket, reason: string) {
  const latestToken = tokenStorage.get();

  instance.auth = latestToken ? { token: latestToken } : {};

  console.info("[SOCKET] socket auth token attached", {
    reason,
    hasToken: Boolean(latestToken),
    connected: instance.connected,
    active: instance.active,
  });

  return latestToken;
}

declare global {
  var __flexchatSocket: Socket | undefined;
}

function buildSocket(): Socket {
  const token = tokenStorage.get();
  const instance = io(resolveSocketUrl(), {
    path: "/socket.io/",
    autoConnect: false,
    transports: ["websocket", "polling"],
    upgrade: true,
    perMessageDeflate: {
      threshold: 1024,
    },
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.45,
    timeout: 20_000,
    withCredentials: false,
    auth: token ? { token } : {},
  });

  instance.io.on("reconnect_attempt", (attempt) => {
    const latestToken = attachSocketAuth(instance, "reconnect_attempt");

    console.info("[SOCKET] reconnect auth state", {
      attempt,
      hasToken: Boolean(latestToken),
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
    });
  });

  instance.io.on("reconnect", (attempt) => {
    console.info("[SOCKET] reconnect succeeded", {
      attempt,
      transport: instance.io.engine?.transport?.name ?? "unknown",
    });
  });

  instance.io.on("reconnect_error", (error) => {
    console.warn("[SOCKET] reconnect failed", {
      message: error.message,
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
    });
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

export function refreshSocketAuth(reason = "manual") {
  return attachSocketAuth(socket, reason);
}
