import axios from "axios";

import { resolveLocalRuntimeUrl } from "@/lib/runtime-url";
import {
  API_AUTH_INVALID_EVENT,
  API_UNAVAILABLE_EVENT,
} from "@/lib/session-events";
import { tokenStorage } from "@/lib/token";

const API_REQUEST_TIMEOUT_MS = 15_000;

function getApiBaseUrl() {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    !window.location.hostname.includes("localhost")
  ) {
    return "/api/backend";
  }

  return resolveLocalRuntimeUrl(
    process.env.NEXT_PUBLIC_API_URL,
    "http://localhost:5000",
  );
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_REQUEST_TIMEOUT_MS,
});

type RefreshResponse = {
  token: string;
};

let refreshPromise: Promise<string> | null = null;

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
    url: api.getUri(config),
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
      ? api.getUri(error.config)
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
      refreshPromise ??= api
        .post<RefreshResponse>("/auth/refresh")
        .then((response) => {
          tokenStorage.set(response.data.token);

          return response.data.token;
        })
        .finally(() => {
          refreshPromise = null;
        });

      const token = await refreshPromise;

      originalRequest.headers = originalRequest.headers ?? {};

      originalRequest.headers.Authorization = `Bearer ${token}`;

      return api(originalRequest);
    } catch (refreshError) {
      console.warn(
        "[FlexChat Auth] refresh rejected; clearing invalid session",
      );
      emitSessionEvent(API_AUTH_INVALID_EVENT, {
        reason: "refresh_failed",
      });
      tokenStorage.remove();

      return Promise.reject(refreshError);
    }
  },
);
