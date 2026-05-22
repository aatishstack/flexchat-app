import { api } from "./api";

import type { PublicUser } from "@/types/user";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
};

export async function getDiscoverUsers(
  query = ""
) {
  const response =
    await api.get<PublicUser[]>(
      "/users/discover",
      {
        params: {
          q:
            query.trim() || undefined,
          limit: 60,
        },
      }
    );

  return response.data;
}

export async function updateCurrentUser(
  data: {
    username?: string;
    avatar?: string | null;
  }
) {
  const response =
    await api.patch<CurrentUser>(
      "/users/me",
      data
    );

  return response.data;
}

export async function deleteCurrentUser() {
  const response =
    await api.delete<{
      ok: boolean;
    }>("/users/me", {
      data: {
        confirmation: "DELETE",
      },
    });

  return response.data;
}

export async function getUsersByIds(
  ids: string[]
) {
  if (!ids.length) {
    return [];
  }

  const response =
    await api.get<PublicUser[]>(
      "/users/lookup",
      {
        params: {
          ids: ids.join(","),
        },
      }
    );

  return response.data;
}

export async function dismissDiscoverUser(
  userId: string
) {
  const response =
    await api.delete<{ ok: boolean }>(
      `/users/discover/${userId}`
    );

  return response.data;
}
