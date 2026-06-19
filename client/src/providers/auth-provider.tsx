"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import { isAxiosError } from "axios";

import {
  API_AUTH_INVALID_EVENT,
  API_UNAVAILABLE_EVENT,
  SESSION_RETRY_EVENT,
} from "@/lib/session-events";
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
  const controller = new AbortController();

  try {
    return await Promise.race([
      getCurrentUser(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(AUTH_TIMEOUT_ERROR));
          controller.abort();
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
      console.info(
        "[AUTH] scheduling session hydration retry",
        {
          delayMs: AUTH_RETRY_DELAY_MS,
        },
      );
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

      console.info(
        "[AUTH] hydrating session",
        {
          hasToken: Boolean(token),
          version: hydrateVersion,
        },
      );

      if (!token) {
        if (!isCurrentHydration()) {
          return;
        }

        clearRetry();
        console.info("[AUTH] auth rejected reason", {
          reason: "missing_token",
        });
        setSessionRecovering(false);
        resetClientSessionState();
        setHydrated(true);
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
        console.info(
          "[AUTH] user hydrated",
          {
            userId: user.id,
          },
        );
        setAuth({
          user,
          token: activeToken,
          refreshToken: tokenStorage.getRefreshToken(),
        });
        setHydrated(true);
        connectSocket(activeToken);
        console.info("[SOCKET] socket auth token attached", {
          source: "auth_hydration",
          hasToken: Boolean(activeToken),
          userId: user.id,
        });
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
          console.warn(
          "[AUTH] stored token was rejected; resetting session",
            {
              status,
            },
          );
          clearRetry();
          setSessionRecovering(false);
          tokenStorage.clear();
          resetClientSessionState();
          setHydrated(true);
          return;
        }

        console.warn(
          "[AUTH] session endpoint unavailable; entering recovery",
          {
            status: status ?? "network_or_timeout",
            reason:
              error instanceof Error
                ? error.message
                : "Unknown hydration failure",
          },
        );

        useSocketStore
          .getState()
          .disconnectSocket();
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

      console.info("[AUTH] token change observed", {
        hasToken: Boolean(token),
      });
      clearRetry();
      void hydrate(token);
    }

    function handleApiUnavailable(event: Event) {
      if (!tokenStorage.exists()) {
        return;
      }

      console.warn(
        "[AUTH] authenticated API became unavailable; suspending live session",
        (event as CustomEvent).detail,
      );
      clearRetry();
      resetClientSessionState();
      setSessionRecovering(true);
      setHydrated(true);
      scheduleRetry();
    }

    function handleInvalidApiSession(event: Event) {
      console.warn(
        "[AUTH] API invalidated the session",
        (event as CustomEvent).detail,
      );
      clearRetry();
      tokenStorage.clear();
      resetClientSessionState();
    }

    function handleSessionRetry() {
      console.info(
        "[AUTH] user requested session retry",
      );
      clearRetry();
      void hydrate();
    }

    const safetyTimer = setTimeout(() => {
      if (
        disposed ||
        useAuthStore.getState().isHydrated
      ) {
        return;
      }

      if (tokenStorage.exists()) {
        useSocketStore
          .getState()
          .disconnectSocket();
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
    window.addEventListener(
      API_UNAVAILABLE_EVENT,
      handleApiUnavailable,
    );
    window.addEventListener(
      API_AUTH_INVALID_EVENT,
      handleInvalidApiSession,
    );
    window.addEventListener(
      SESSION_RETRY_EVENT,
      handleSessionRetry,
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
      window.removeEventListener(
        API_UNAVAILABLE_EVENT,
        handleApiUnavailable,
      );
      window.removeEventListener(
        API_AUTH_INVALID_EVENT,
        handleInvalidApiSession,
      );
      window.removeEventListener(
        SESSION_RETRY_EVENT,
        handleSessionRetry,
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
