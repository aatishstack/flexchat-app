import { api } from "./api";

import { isAxiosError } from "axios";

import type { PublicUser } from "@/types/user";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  phoneNumber?: string | null;
};

const PHONE_NUMBER_IN_USE_MESSAGE =
  "This phone number is already in use. Please use a different number.";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : fallback;
  }

  const responseMessage =
    typeof error.response?.data === "object" &&
    error.response.data &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
      ? error.response.data.message
      : undefined;

  if (
    responseMessage ===
    "Mobile number is already linked to another account"
  ) {
    return PHONE_NUMBER_IN_USE_MESSAGE;
  }

  return responseMessage ?? fallback;
}

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
    phoneNumber?: string | null;
  }
) {
  try {
    const response =
      await api.patch<CurrentUser>(
        "/users/me",
        data
      );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "Could not update your profile. Please try again.",
      ),
    );
  }
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
