"use client";

import { useRouter } from "next/navigation";

import { tokenStorage } from "@/lib/token";

import { useAuthStore } from "@/stores/auth.store";

export const useLogout =
  () => {
    const router =
      useRouter();

    const logout =
      useAuthStore(
        (state) =>
          state.logout
      );

    const handleLogout =
      () => {
        tokenStorage.remove();

        logout();

        router.replace(
          "/auth"
        );
      };

    return handleLogout;
  };