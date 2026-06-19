import axios from "axios";

import { resolveLocalRuntimeUrl } from "@/lib/runtime-url";
import {
  API_AUTH_INVALID_EVENT,
  API_UNAVAILABLE_EVENT,
} from "@/lib/session-events";
import { tokenStorage } from "@/lib/token";

const API_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_API_BASE_URL = "http://localhost:5000";

function getConfiguredApiUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    undefined
  );
}

function isLocalApiUrl(value: string | undefined) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function getLoggableUrl(value: string) {
  try {
    return new URL(value, "https://flexchat.local").pathname;
  } catch {
    return value.split("?")[0] ?? value;
  }
}

export function getApiBaseUrl() {
  const configuredUrl = getConfiguredApiUrl();

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    !window.location.hostname.includes("localhost") &&
    isLocalApiUrl(configuredUrl)
  ) {
    return "/api/backend";
  }

  return resolveLocalRuntimeUrl(
    configuredUrl,
    DEFAULT_API_BASE_URL,
  );
}

export function getOAuthApiBaseUrl() {
  const configuredUrl = getConfiguredApiUrl();

  if (configuredUrl) {
    return resolveLocalRuntimeUrl(configuredUrl, configuredUrl);
  }

  return getApiBaseUrl();
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_REQUEST_TIMEOUT_MS,
});

type RefreshResponse = {
  token: string;
  refreshToken: string;
};

let refreshPromise: Promise<string> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined") {
  try {
    broadcastChannel = new BroadcastChannel("flexchat_auth_refresh");
  } catch (err) {
    console.error("Failed to initialize BroadcastChannel", err);
  }
}

export async function getFreshToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const storedRefreshToken = tokenStorage.getRefreshToken();
  if (!storedRefreshToken) {
    throw new Error("No refresh token stored");
  }

  const lockKey = "flexchat_refresh_lock";
  const lockTime = typeof window !== "undefined" ? localStorage.getItem(lockKey) : null;
  const now = Date.now();

  if (lockTime && now - parseInt(lockTime, 10) < 8000) {
    console.info("[AUTH] Another tab is currently refreshing. Waiting for broadcast...");

    refreshPromise = new Promise<string>((resolve, reject) => {
      let resolved = false;

      const handleMessage = (event: MessageEvent) => {
        if (!event.data || resolved) return;
        if (event.data.type === "refresh_success") {
          resolved = true;
          cleanup();
          resolve(event.data.token);
        } else if (event.data.type === "refresh_failure") {
          resolved = true;
          cleanup();
          reject(new Error("Refresh failed in other tab"));
        }
      };

      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        console.warn("[AUTH] Refresh broadcast timed out. Attempting refresh locally.");
        refreshPromise = null;
        getFreshToken().then(resolve).catch(reject);
      }, 5000);

      const cleanup = () => {
        clearTimeout(timeout);
        broadcastChannel?.removeEventListener("message", handleMessage);
      };

      broadcastChannel?.addEventListener("message", handleMessage);
    });

    return refreshPromise;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(lockKey, now.toString());
  }

  refreshPromise = api
    .post<RefreshResponse>(
      "/auth/refresh",
      { refreshToken: storedRefreshToken },
      {
        headers: {
          Authorization: `Bearer ${storedRefreshToken}`,
          "x-refresh-token": storedRefreshToken,
        },
      }
    )
    .then((response) => {
      const newToken = response.data.token;
      const newRefreshToken = response.data.refreshToken;

      tokenStorage.set(newToken);
      if (newRefreshToken) {
        tokenStorage.setRefreshToken(newRefreshToken);
      }

      broadcastChannel?.postMessage({
        type: "refresh_success",
        token: newToken,
      });

      return newToken;
    })
    .catch((error) => {
      broadcastChannel?.postMessage({
        type: "refresh_failure",
        error: error.message,
      });
      throw error;
    })
    .finally(() => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(lockKey);
      }
      refreshPromise = null;
    });

  return refreshPromise;
}

function emitSessionEvent(
  eventName: string,
  detail: Record<string, unknown>,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
    }),
  );
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.info("[FlexChat API] request", {
    method: config.method?.toUpperCase() ?? "GET",
    url: getLoggableUrl(api.getUri(config)),
    hasToken: Boolean(token),
  });

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const method =
      error.config?.method?.toUpperCase() ??
      "UNKNOWN";
    const url = error.config
      ? getLoggableUrl(api.getUri(error.config))
      : "unknown";

    console.error("[FlexChat API] response failed", {
      method:
        method,
      url,
      status: status ?? "network_error",
      message:
        error.response?.data?.message ??
        error.message ??
        "Request failed",
    });

    if (
      tokenStorage.exists() &&
      (method === "GET" ||
        url.includes("/auth/refresh")) &&
      (!error.response ||
        status === 502 ||
        status === 503 ||
        status === 504)
    ) {
      emitSessionEvent(API_UNAVAILABLE_EVENT, {
        status: status ?? "network_error",
        url,
      });
    }

    const originalRequest = error.config as
      | (typeof error.config & {
          _retry?: boolean;
        })
      | undefined;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const token = await getFreshToken();

      originalRequest.headers = originalRequest.headers ?? {};

      originalRequest.headers.Authorization = `Bearer ${token}`;

      return api(originalRequest);
    } catch (refreshError) {
      console.warn(
        "[AUTH] refresh rejected; clearing invalid session",
      );
      emitSessionEvent(API_AUTH_INVALID_EVENT, {
        reason: "refresh_failed",
      });
      tokenStorage.clear();

      return Promise.reject(refreshError);
    }
  },
);
