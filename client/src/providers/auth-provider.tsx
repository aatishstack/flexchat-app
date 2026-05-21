"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  TOKEN_CHANGE_EVENT,
  TOKEN_KEY,
  tokenStorage,
} from "@/lib/token";
import { clearClientSession } from "@/lib/session-cleanup";

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

  const connectSocket =
    useSocketStore(
      (state) =>
        state.connectSocket
    );

  const resetClientSessionState =
    useCallback(() => {
      clearClientSession({
        removeToken: false,
      });
    }, []);

  const hydrateVersionRef =
    useRef(0);

  useEffect(() => {
    let disposed = false;

    async function hydrate(
      tokenOverride?: string | null
    ) {
      const hydrateVersion =
        hydrateVersionRef.current + 1;

      hydrateVersionRef.current =
        hydrateVersion;

      const isCurrentHydration = () =>
        !disposed &&
        hydrateVersionRef.current ===
          hydrateVersion;

      try {
        const token =
          tokenOverride === undefined
            ? tokenStorage.get()
            : tokenOverride;

        if (!token) {
          if (!isCurrentHydration()) {
            return;
          }

          resetClientSessionState();

          return;
        }

        const user =
          await getCurrentUser();

        if (!isCurrentHydration()) {
          return;
        }

        const activeToken =
          tokenStorage.get();

        if (!activeToken) {
          resetClientSessionState();

          return;
        }

        const currentUser =
          useAuthStore.getState().user;

        if (
          currentUser &&
          currentUser.id !== user.id
        ) {
          resetClientSessionState();
        }

        setAuth({
          user,
          token: activeToken,
        });

        connectSocket(
          activeToken
        );
      } catch {
        if (!isCurrentHydration()) {
          return;
        }

        tokenStorage.remove();

        resetClientSessionState();
      } finally {
        if (isCurrentHydration()) {
          setHydrated(
            true
          );
        }
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
      disposed = true;

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
    resetClientSessionState,
    setAuth,
    setHydrated,
  ]);

  return children;
}
