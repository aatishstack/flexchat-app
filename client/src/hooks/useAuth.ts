"use client";

import { useAuthStore } from "@/stores/auth.store";

export function useAuth() {
  const user =
    useAuthStore(
      (state) => state.user
    );

  const token =
    useAuthStore(
      (state) => state.token
    );

  const isAuthenticated =
    useAuthStore(
      (state) =>
        state.isAuthenticated
    );

  const isHydrated =
    useAuthStore(
      (state) =>
        state.isHydrated
    );

  return {
    user,

    token,

    isAuthenticated,

    isHydrated,

    status: isHydrated
      ? isAuthenticated
        ? "authenticated"
        : "unauthenticated"
      : "loading",
  };
}
