"use client";

import {
  useEffect,
} from "react";

import { tokenStorage } from "@/lib/token";

import { useAuthStore } from "@/stores/auth.store";

import { getCurrentUser } from "@/services/auth.service";

import { useSocketStore } from "@/store/socket-store";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const connectSocket =
    useSocketStore(
      (state) =>
        state.connectSocket
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

        connectSocket(
          token
        );
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

  return children;
}