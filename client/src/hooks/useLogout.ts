"use client";

import { useRouter } from "next/navigation";

import { tokenStorage } from "@/lib/token";

import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/store/socket-store";

export const useLogout =
  () => {
    const router =
      useRouter();

    const logout =
      useAuthStore(
        (state) =>
          state.logout
      );

    const disconnectSocket =
      useSocketStore(
        (state) =>
          state.disconnectSocket
      );

    const handleLogout =
      () => {
        tokenStorage.remove();

        disconnectSocket();

        logout();

        router.replace(
          "/auth"
        );
      };

    return handleLogout;
  };
