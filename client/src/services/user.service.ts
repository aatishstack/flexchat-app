import { api } from "./api";

import type { PublicUser } from "@/types/user";

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
