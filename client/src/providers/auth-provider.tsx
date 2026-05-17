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
import { queryClient } from "@/lib/query-client";

import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";

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

  const resetClientSessionState =
    useCallback(() => {
      queryClient.clear();
      useConversationStore
        .getState()
        .resetConversationState();
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
          disconnectSocket();
          logout();

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
          disconnectSocket();
          logout();

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

        disconnectSocket();

        logout();
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
    disconnectSocket,
    logout,
    resetClientSessionState,
    setAuth,
    setHydrated,
  ]);

  return children;
}
