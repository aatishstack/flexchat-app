"use client";

import {
  useEffect,
} from "react";

import { tokenStorage } from "@/lib/token";

import { useAuthStore } from "@/stores/auth.store";

import { getCurrentUser } from "@/services/auth.service";

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

  const setAuth =
    useAuthStore(
      (state) =>
        state.setAuth
    );

  const setHydrated =
    useAuthStore(
      (state) =>
        state.setHydrated
    );

  const logout =
    useAuthStore(
      (state) =>
        state.logout
    );

  useEffect(() => {
    async function hydrate() {
      try {
        const token =
          tokenStorage.get();

        if (!token) {
          setHydrated(
            true
          );

          return;
        }

        const user =
          await getCurrentUser();

        setAuth({
          user,
          token,
        });
      } catch {
        tokenStorage.remove();

        logout();
      } finally {
        setHydrated(
          true
        );
      }
    }

    hydrate();
  }, []);

  return {
    user,

    token,

    isAuthenticated,

    isHydrated,
  };
}