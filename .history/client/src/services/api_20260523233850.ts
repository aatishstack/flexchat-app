import axios from "axios";

import { resolveLocalRuntimeUrl } from "@/lib/runtime-url";
import { tokenStorage } from "@/lib/token";

function getApiBaseUrl() {
  return resolveLocalRuntimeUrl(
    process.env.NEXT_PUBLIC_API_URL,
    "http://localhost:5000",
  );
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

type RefreshResponse = {
  token: string;
};

let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
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
      tokenStorage.remove();

      return Promise.reject(refreshError);
    }
  },
);
