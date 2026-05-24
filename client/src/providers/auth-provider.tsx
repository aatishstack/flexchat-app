"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import { isAxiosError } from "axios";

import {
  TOKEN_CHANGE_EVENT,
  TOKEN_KEY,
  tokenStorage,
} from "@/lib/token";
import { clearClientSession } from "@/lib/session-cleanup";
import { getCurrentUser } from "@/services/auth.service";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";

const AUTH_TIMEOUT_ERROR = "auth_timeout";
const AUTH_TIMEOUT_MS = 8_000;
const AUTH_RETRY_DELAY_MS = 3_000;
const AUTH_SAFETY_TIMEOUT_MS = 12_000;

async function getCurrentUserWithTimeout() {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      getCurrentUser(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(AUTH_TIMEOUT_ERROR));
        }, AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setAuth = useAuthStore(
    (state) => state.setAuth,
  );
  const setHydrated = useAuthStore(
    (state) => state.setHydrated,
  );
  const setSessionRecovering = useAuthStore(
    (state) => state.setSessionRecovering,
  );
  const connectSocket = useSocketStore(
    (state) => state.connectSocket,
  );
  const resetClientSessionState = useCallback(() => {
    clearClientSession({
      removeToken: false,
    });
  }, []);
  const hydrateVersionRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function clearRetry() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
    }

    function scheduleRetry() {
      clearRetry();
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void hydrate();
      }, AUTH_RETRY_DELAY_MS);
    }

    async function hydrate(
      tokenOverride?: string | null,
    ) {
      const hydrateVersion =
        hydrateVersionRef.current + 1;

      hydrateVersionRef.current =
        hydrateVersion;

      const isCurrentHydration = () =>
        !disposed &&
        hydrateVersionRef.current === hydrateVersion;

      const token =
        tokenOverride === undefined
          ? tokenStorage.get()
          : tokenOverride;

      if (!token) {
        if (!isCurrentHydration()) {
          return;
        }

        clearRetry();
        setSessionRecovering(false);
        resetClientSessionState();
        return;
      }

      try {
        const user = await getCurrentUserWithTimeout();

        if (!isCurrentHydration()) {
          return;
        }

        const activeToken = tokenStorage.get();

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

        clearRetry();
        setAuth({
          user,
          token: activeToken,
        });
        setHydrated(true);
        connectSocket(activeToken);
      } catch (error) {
        if (!isCurrentHydration()) {
          return;
        }

        const status = isAxiosError(error)
          ? error.response?.status
          : undefined;
        const tokenIsInvalid =
          status === 401 ||
          status === 403 ||
          status === 404;

        if (tokenIsInvalid) {
          clearRetry();
          setSessionRecovering(false);
          tokenStorage.remove();
          resetClientSessionState();
          return;
        }

        if (
          error instanceof Error &&
          error.message !== AUTH_TIMEOUT_ERROR
        ) {
          console.warn(
            "Session hydration unavailable; retrying.",
            error.message,
          );
        }

        setSessionRecovering(true);
        setHydrated(true);
        scheduleRetry();
      }
    }

    void hydrate();

    function handleStorage(
      event: StorageEvent,
    ) {
      if (event.key !== TOKEN_KEY) {
        return;
      }

      clearRetry();
      void hydrate(event.newValue);
    }

    function handleTokenChange(
      event: Event,
    ) {
      const token =
        (event as CustomEvent<{
          token: string | null;
        }>).detail?.token ?? null;

      clearRetry();
      void hydrate(token);
    }

    const safetyTimer = setTimeout(() => {
      if (
        disposed ||
        useAuthStore.getState().isHydrated
      ) {
        return;
      }

      if (tokenStorage.exists()) {
        setSessionRecovering(true);
        scheduleRetry();
      }

      setHydrated(true);
    }, AUTH_SAFETY_TIMEOUT_MS);

    window.addEventListener(
      "storage",
      handleStorage,
    );
    window.addEventListener(
      TOKEN_CHANGE_EVENT,
      handleTokenChange,
    );

    return () => {
      disposed = true;
      clearRetry();
      clearTimeout(safetyTimer);

      window.removeEventListener(
        "storage",
        handleStorage,
      );
      window.removeEventListener(
        TOKEN_CHANGE_EVENT,
        handleTokenChange,
      );
    };
  }, [
    connectSocket,
    resetClientSessionState,
    setAuth,
    setHydrated,
    setSessionRecovering,
  ]);

  return children;
}
