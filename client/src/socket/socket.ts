import { io, type Socket } from "socket.io-client";

import { tokenStorage } from "@/lib/token";

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

function createSocket(): Socket {
  const token = tokenStorage.get();

  return io(resolveSocketUrl(), {
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

    globalSocket.__flexchatSocket =
      createdSocket;

    createdSocket.io.on(
      "reconnect_attempt",
      (attempt) => {
        const token =
          tokenStorage.get();

        console.info("[FlexChat Socket] reconnect attempt", {
          attempt,
          hasToken: Boolean(token),
        });

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
      },
    );

    return createdSocket;
  })();
