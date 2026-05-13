import { api } from "./api";

export interface AuthResponse {
  token: string;

  user: {
    id: string;

    username: string;

    email: string;
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

export async function getCurrentUser() {
  const response =
    await api.get(
      "/me"
    );

  return response.data;
}