import {
  api,
  getOAuthApiBaseUrl,
} from "./api";

export { getOAuthApiBaseUrl };

export interface AuthResponse {
  token: string;

  user: {
    id: string;

    username: string;

    email: string;

    avatar?: string | null;

    createdAt?: string | null;
  };
}

export async function login(
  data: {
    email: string;

    password: string;
  }
) {
  const response =
    await api.post<AuthResponse>(
      "/auth/login",
      data
    );

  return response.data;
}

export async function register(
  data: {
    username: string;

    email: string;

    password: string;
  }
) {
  const response =
    await api.post<AuthResponse>(
      "/auth/register",
      data
    );

  return response.data;
}

export function getGoogleOAuthStartUrl() {
  if (typeof window === "undefined") {
    return "/auth/google/start";
  }

  const apiBaseUrl = getOAuthApiBaseUrl();
  const absoluteApiBaseUrl = apiBaseUrl.startsWith("/")
    ? `${window.location.origin}${apiBaseUrl}`
    : apiBaseUrl;
  const url = new URL(
    `${absoluteApiBaseUrl.replace(/\/$/, "")}/auth/google/start`,
  );

  url.searchParams.set("frontendOrigin", window.location.origin);
  url.searchParams.set("popup", "true");

  return url.toString();
}

export async function getCurrentUser(
  signal?: AbortSignal,
) {
  const response =
    await api.get(
      "/me",
      {
        signal,
      },
    );

  return response.data;
}
