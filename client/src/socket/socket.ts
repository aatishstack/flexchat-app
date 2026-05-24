import {
  io,
  type ManagerOptions,
  type Socket,
  type SocketOptions,
} from "socket.io-client";

import { tokenStorage } from "@/lib/token";

const SOCKET_TRANSPORTS = [
  "websocket",
  "polling",
] as const;

const SOCKET_CONNECT_TIMEOUT_MS = 30_000;
const SOCKET_RECONNECTION_DELAY_MS = 1_000;
const SOCKET_RECONNECTION_DELAY_MAX_MS = 15_000;

type FlexSocketOptions =
  Partial<ManagerOptions & SocketOptions> & {
    tryAllTransports?: boolean;
  };

function resolveSocketUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    ) {
      return `http://${hostname}:5000`;
    }
  }

  return "https://flexchat-app-production.up.railway.app";
}

const globalSocket =
  globalThis as typeof globalThis & {
    __flexchatSocket?: Socket;
  };

export function configureSocketAuth(
  targetSocket: Socket,
  token: string | null,
) {
  const nextToken = token?.trim();

  targetSocket.auth = nextToken
    ? {
        token: nextToken,
      }
    : {};

  targetSocket.io.opts.query = nextToken
    ? {
        token: nextToken,
      }
    : {};

  targetSocket.io.opts.transports = [
    ...SOCKET_TRANSPORTS,
  ];
  targetSocket.io.opts.withCredentials = false;
}

function buildSocketOptions(
  token: string | null,
): FlexSocketOptions {
  const nextToken = token?.trim();

  return {
    path: "/socket.io/",
    autoConnect: false,
    transports: [
      ...SOCKET_TRANSPORTS,
    ],
    upgrade: true,
    tryAllTransports: true,
    rememberUpgrade: false,
    forceNew: true,
    multiplex: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: SOCKET_RECONNECTION_DELAY_MS,
    reconnectionDelayMax: SOCKET_RECONNECTION_DELAY_MAX_MS,
    randomizationFactor: 0.4,
    timeout: SOCKET_CONNECT_TIMEOUT_MS,
    withCredentials: false,
    auth: nextToken
      ? {
          token: nextToken,
        }
      : {},
    query: nextToken
      ? {
          token: nextToken,
        }
      : {},
  };
}

export function createSocket(
  token = tokenStorage.get(),
): Socket {
  const createdSocket =
    io(resolveSocketUrl(), buildSocketOptions(token));

  attachSocketDiagnostics(createdSocket);

  return createdSocket;
}

function attachEngineDiagnostics(
  targetSocket: Socket,
) {
  const engine = targetSocket.io.engine;

  if (
    !engine ||
    (
      engine as typeof engine & {
        __flexchatDiagnosticsAttached?: boolean;
      }
    ).__flexchatDiagnosticsAttached
  ) {
    return;
  }

  (
    engine as typeof engine & {
      __flexchatDiagnosticsAttached?: boolean;
    }
  ).__flexchatDiagnosticsAttached = true;

  console.info("[FlexChat Socket] engine ready", {
    id: targetSocket.id,
    transport: engine.transport?.name,
  });

  engine.on("upgrade", (transport) => {
    console.info("[FlexChat Socket] transport upgraded", {
      id: targetSocket.id,
      transport: transport.name,
    });
  });

  engine.on("upgradeError", (error) => {
    console.warn("[FlexChat Socket] transport upgrade failed", {
      id: targetSocket.id,
      message:
        error instanceof Error
          ? error.message
          : "Unknown upgrade failure",
    });
  });

  engine.on("close", (reason) => {
    console.warn("[FlexChat Socket] engine closed", {
      id: targetSocket.id,
      reason,
      transport: engine.transport?.name,
    });
  });
}

function attachSocketDiagnostics(
  targetSocket: Socket,
) {
  const diagnosticSocket =
    targetSocket as Socket & {
      __flexchatDiagnosticsAttached?: boolean;
    };

  if (diagnosticSocket.__flexchatDiagnosticsAttached) {
    return;
  }

  diagnosticSocket.__flexchatDiagnosticsAttached = true;

  targetSocket.on("connect", () => {
    attachEngineDiagnostics(targetSocket);
  });

  targetSocket.io.on(
    "reconnect_attempt",
    (attempt) => {
      const token = tokenStorage.get();

      console.info("[FlexChat Socket] reconnect attempt", {
        attempt,
        hasToken: Boolean(token),
        transport:
          targetSocket.io.engine?.transport?.name,
      });

      configureSocketAuth(targetSocket, token);
    },
  );

  targetSocket.io.on("reconnect", (attempt) => {
    console.info("[FlexChat Socket] reconnected", {
      attempt,
      id: targetSocket.id,
      transport:
        targetSocket.io.engine?.transport?.name,
    });
  });

  targetSocket.io.on("reconnect_error", (error) => {
    console.warn("[FlexChat Socket] reconnect error", {
      message: error.message,
      transport:
        targetSocket.io.engine?.transport?.name,
    });
  });

  targetSocket.io.on("reconnect_failed", () => {
    console.error("[FlexChat Socket] reconnect failed");
  });
}

export function destroySocket(
  targetSocket: Socket,
) {
  try {
    targetSocket.removeAllListeners();
    targetSocket.io.removeAllListeners();
    targetSocket.disconnect();
    targetSocket.io.engine?.close();
  } catch (error) {
    console.warn("[FlexChat Socket] destroy failed", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown socket destroy failure",
    });
  }
}

export let socket: Socket =
  globalSocket.__flexchatSocket ??
  createSocket();

globalSocket.__flexchatSocket = socket;

export function recreateSocket(
  token = tokenStorage.get(),
  reason = "manual",
) {
  console.info("[FlexChat Socket] recreating socket", {
    reason,
    hasToken: Boolean(token),
  });

  destroySocket(socket);

  socket = createSocket(token);
  globalSocket.__flexchatSocket = socket;

  return socket;
}
