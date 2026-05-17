"use client";

import { useEffect, useRef } from "react";

import {
  TOKEN_CHANGE_EVENT,
  TOKEN_KEY,
  tokenStorage,
} from "@/lib/token";

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

  const disconnectSocket =
    useSocketStore(
      (state) =>
        state.disconnectSocket
    );

  const hydrateVersionRef =
    useRef(0);

  useEffect(() => {
    async function hydrate(
      tokenOverride?: string | null
    ) {
      const hydrateVersion =
        hydrateVersionRef.current + 1;

      hydrateVersionRef.current =
        hydrateVersion;

      try {
        const token =
          tokenOverride === undefined
            ? tokenStorage.get()
            : tokenOverride;

        if (!token) {
          disconnectSocket();
          logout();
          setHydrated(
            true
          );

          return;
        }

        const user =
          await getCurrentUser();

        if (
          hydrateVersionRef.current !==
          hydrateVersion
        ) {
          return;
        }

        setAuth({
          user,
          token,
        });

        connectSocket(
          token
        );
      } catch {
        if (
          hydrateVersionRef.current !==
          hydrateVersion
        ) {
          return;
        }

        tokenStorage.remove();

        disconnectSocket();

        logout();
      } finally {
        setHydrated(
          true
        );
      }
    }

    hydrate();

    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key !== TOKEN_KEY
      ) {
        return;
      }

      hydrate(
        event.newValue
      );
    }

    function handleTokenChange(
      event: Event
    ) {
      const token =
        (event as CustomEvent<{
          token: string | null;
        }>).detail?.token ?? null;

      hydrate(
        token
      );
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      TOKEN_CHANGE_EVENT,
      handleTokenChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        TOKEN_CHANGE_EVENT,
        handleTokenChange
      );
    };
  }, [
    connectSocket,
    disconnectSocket,
    logout,
    setAuth,
    setHydrated,
  ]);

  return children;
}
