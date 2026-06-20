"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import { isAxiosError } from "axios";

import {
  API_AUTH_INVALID_EVENT,
  API_RECOVERED_EVENT,
  API_UNAVAILABLE_EVENT,
  SESSION_RETRY_EVENT,
} from "@/lib/session-events";
import {
  TOKEN_CHANGE_EVENT,
  TOKEN_KEY,
  tokenStorage,
} from "@/lib/token";
import { clearClientSession } from "@/lib/session-cleanup";
import { syncServerTime } from "@/lib/server-time";
import { getCurrentUser } from "@/services/auth.service";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";

const AUTH_TIMEOUT_ERROR = "auth_timeout";
const AUTH_TIMEOUT_MS = 8_000;
const AUTH_RETRY_DELAY_MS = 3_000;
const AUTH_SAFETY_TIMEOUT_MS = 12_000;
// The "Connection interrupted" banner must not flash for a single failed
// background request. Only surface it after this many consecutive failures.
const API_UNAVAILABLE_THRESHOLD = 2;

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
  const setApiUnavailable = useAuthStore(
    (state) => state.setApiUnavailable,
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
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const apiUnavailableCountRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function clearRetry() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
    }

    function clearWatchdog() {
      if (watchdogTimerRef.current) {
        console.info("[AUTH] WATCHDOG_CLEAR", {
          version: hydrateVersionRef.current,
          timestamp: Date.now(),
        });
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = undefined;
      }
    }

    function triggerWatchdog(version: number, triggerSource: string) {
      console.warn("[AUTH] WATCHDOG_FIRE", {
        version,
        timestamp: Date.now(),
        triggerSource,
      });

      if (disposed) return;

      const isRequestActive = activeAbortControllerRef.current !== null;
      const isCurrentVersion = hydrateVersionRef.current === version;
      const isAuthenticated = useAuthStore.getState().isAuthenticated;

      if (!isCurrentVersion || !isRequestActive || isAuthenticated) {
        console.info("[AUTH] Watchdog ignored safety validation checks", {
          isCurrentVersion,
          isRequestActive,
          isAuthenticated,
        });
        return;
      }

      if (tokenStorage.exists()) {
        useSocketStore
          .getState()
          .disconnectSocket();
        // A valid token exists and the backend is simply slow/unreachable
        // (cold start, deploy, DB/Redis wakeup). Recover silently — never
        // surface the session recovery screen for a transient condition.
        setSessionRecovering(false);
        scheduleRetry();
      }

      setHydrated(true);
    }

    function armWatchdog(version: number, triggerSource: string) {
      clearWatchdog();
      console.info("[AUTH] WATCHDOG_ARM", {
        version,
        timestamp: Date.now(),
        triggerSource,
      });
      watchdogTimerRef.current = setTimeout(() => {
        watchdogTimerRef.current = undefined;
        triggerWatchdog(version, triggerSource);
      }, AUTH_SAFETY_TIMEOUT_MS);
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
        void hydrate(undefined, "scheduled_retry");
      }, AUTH_RETRY_DELAY_MS);
    }

    async function hydrate(
      tokenOverride?: string | null,
      triggerSource: string = "mount",
    ) {
      const previousVersion = hydrateVersionRef.current;
      const hydrateVersion = previousVersion + 1;
      hydrateVersionRef.current = hydrateVersion;

      const isCurrentHydration = () =>
        !disposed &&
        hydrateVersionRef.current === hydrateVersion;

      const token =
        tokenOverride === undefined
          ? tokenStorage.get()
          : tokenOverride;

      console.info("[AUTH] HYDRATE_START", {
        timestamp: Date.now(),
        version: hydrateVersion,
        endpoint: "/auth/me",
        statusCode: null,
        tokenPresent: Boolean(token),
        refreshTokenPresent: Boolean(tokenStorage.getRefreshToken()),
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        isSessionRecovering: useAuthStore.getState().isSessionRecovering,
      });

      // Abort previous GET /me request if any
      if (activeAbortControllerRef.current) {
        console.info("[AUTH] HYDRATE_ABORT", {
          version: previousVersion,
          timestamp: Date.now(),
          triggerSource: `superseded_by_${triggerSource}`,
        });
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }

      // Reset safety timer for this hydration invocation
      armWatchdog(hydrateVersion, triggerSource);

      if (!token) {
        if (!isCurrentHydration()) {
          return;
        }

        clearRetry();
        clearWatchdog();
        console.info("[AUTH] HYDRATE_SUCCESS", {
          timestamp: Date.now(),
          version: hydrateVersion,
          endpoint: null,
          statusCode: null,
          tokenPresent: false,
          refreshTokenPresent: Boolean(tokenStorage.getRefreshToken()),
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          isSessionRecovering: useAuthStore.getState().isSessionRecovering,
        });
        setApiUnavailable(false);
        setSessionRecovering(false);
        resetClientSessionState();
        setHydrated(true);
        return;
      }

      try {
        const abortController = new AbortController();
        activeAbortControllerRef.current = abortController;

        const user = await Promise.race([
          getCurrentUser(abortController.signal),
          new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(AUTH_TIMEOUT_ERROR));
              abortController.abort();
            }, AUTH_TIMEOUT_MS);

            abortController.signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
            });
          }),
        ]);

        if (!isCurrentHydration()) {
          return;
        }

        activeAbortControllerRef.current = null;
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
        clearWatchdog();
        console.info("[AUTH] HYDRATE_SUCCESS", {
          timestamp: Date.now(),
          version: hydrateVersion,
          endpoint: "/auth/me",
          statusCode: 200,
          tokenPresent: true,
          refreshTokenPresent: Boolean(tokenStorage.getRefreshToken()),
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          isSessionRecovering: useAuthStore.getState().isSessionRecovering,
        });
        setAuth({
          user,
          token: activeToken,
          refreshToken: tokenStorage.getRefreshToken(),
        });
        apiUnavailableCountRef.current = 0;
        setApiUnavailable(false);
        setHydrated(true);
        connectSocket(activeToken);
        // Refresh the server-time offset on each successful login so relative
        // and last-seen timestamps are correct after logout/login cycles.
        void syncServerTime().catch(() => undefined);
        console.info("[SOCKET] socket auth token attached", {
          source: "auth_hydration",
          hasToken: Boolean(activeToken),
          userId: user.id,
        });
      } catch (error) {
        if (!isCurrentHydration()) {
          return;
        }

        activeAbortControllerRef.current = null;
        const status = isAxiosError(error)
          ? error.response?.status
          : undefined;
        const tokenIsInvalid =
          status === 401 ||
          status === 403;

        if (tokenIsInvalid) {
          console.warn("[AUTH] HYDRATE_FAIL", {
            timestamp: Date.now(),
            version: hydrateVersion,
            endpoint: "/auth/me",
            statusCode: status,
            tokenPresent: true,
            refreshTokenPresent: Boolean(tokenStorage.getRefreshToken()),
            isAuthenticated: useAuthStore.getState().isAuthenticated,
            isSessionRecovering: useAuthStore.getState().isSessionRecovering,
          });
          clearRetry();
          clearWatchdog();
          setApiUnavailable(false);
          setSessionRecovering(false);
          apiUnavailableCountRef.current = 0;
          tokenStorage.clear();
          resetClientSessionState();
          setHydrated(true);
          return;
        }

        console.warn("[AUTH] HYDRATE_FAIL", {
          timestamp: Date.now(),
          version: hydrateVersion,
          endpoint: "/auth/me",
          statusCode: status ?? "network_or_timeout",
          tokenPresent: true,
          refreshTokenPresent: Boolean(tokenStorage.getRefreshToken()),
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          isSessionRecovering: useAuthStore.getState().isSessionRecovering,
        });

        useSocketStore
          .getState()
          .disconnectSocket();
        // Transient failure (timeout / network / 502-504 / cold start / deploy /
        // DB or Redis wakeup). The token is still valid, so NEVER show the
        // session recovery screen — recover silently in the background. A
        // throttled, auto-dismissing "connection" banner is the only signal.
        apiUnavailableCountRef.current += 1;
        setApiUnavailable(
          apiUnavailableCountRef.current >= API_UNAVAILABLE_THRESHOLD,
        );
        setSessionRecovering(false);
        setHydrated(true);
        scheduleRetry();
      }
    }

    void hydrate(undefined, "mount");

    function handleStorage(
      event: StorageEvent,
    ) {
      if (event.key !== TOKEN_KEY) {
        return;
      }

      clearRetry();
      void hydrate(event.newValue, "storage_event");
    }

    function handleTokenChange(
      event: Event,
    ) {
      console.info("[AUTH] TOKEN_CHANGE_EVENT received", {
        timestamp: Date.now(),
        detail: (event as CustomEvent).detail,
      });
      const token =
        (event as CustomEvent<{
          token: string | null;
        }>).detail?.token ?? null;

      clearRetry();
      void hydrate(token, "token_change_event");
    }

    function handleApiUnavailable(event: Event) {
      console.warn("[AUTH] API_UNAVAILABLE_EVENT received", {
        timestamp: Date.now(),
        detail: (event as CustomEvent).detail,
      });
      if (!tokenStorage.exists()) {
        return;
      }

      const detail =
        (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const diagnostic = {
        url:
          typeof detail.url === "string"
            ? detail.url
            : "unknown",
        status:
          typeof detail.status === "number" ||
          typeof detail.status === "string"
            ? detail.status
            : "network_error",
        method:
          typeof detail.method === "string"
            ? detail.method
            : "UNKNOWN",
        timestamp:
          typeof detail.timestamp === "string"
            ? detail.timestamp
            : new Date().toISOString(),
      };

      console.warn(
        "[AUTH] authenticated API became unavailable; recovering in background",
        diagnostic,
      );
      clearRetry();
      useSocketStore
        .getState()
        .disconnectSocket();
      apiUnavailableCountRef.current += 1;
      // Silent recovery first: only raise the banner once failures persist.
      setApiUnavailable(
        apiUnavailableCountRef.current >= API_UNAVAILABLE_THRESHOLD,
      );
      setSessionRecovering(false);
      setHydrated(true);
      scheduleRetry();
    }

    function handleInvalidApiSession(event: Event) {
      console.warn(
        "[AUTH] API_AUTH_INVALID_EVENT received",
        (event as CustomEvent).detail,
      );
      console.warn(
        "[AUTH] API invalidated the session",
        (event as CustomEvent).detail,
      );
      clearRetry();
      clearWatchdog();
      setApiUnavailable(false);
      tokenStorage.clear();
      resetClientSessionState();
    }

    function handleSessionRetry() {
      clearRetry();
      void hydrate(undefined, "manual_retry");
    }

    function handleApiRecovered() {
      // A request succeeded again: silently clear any warning state and reset
      // the failure counters so brief blips never accumulate into a banner.
      apiUnavailableCountRef.current = 0;
      if (useAuthStore.getState().isApiUnavailable) {
        setApiUnavailable(false);
      }
      if (
        useAuthStore.getState().isSessionRecovering &&
        useAuthStore.getState().isAuthenticated
      ) {
        setSessionRecovering(false);
      }
    }

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
      API_RECOVERED_EVENT,
      handleApiRecovered,
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
      clearWatchdog();
      if (activeAbortControllerRef.current) {
        console.info("[AUTH] HYDRATE_ABORT", {
          version: hydrateVersionRef.current,
          timestamp: Date.now(),
          triggerSource: "unmount",
        });
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }

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
        API_RECOVERED_EVENT,
        handleApiRecovered,
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
    setApiUnavailable,
    setHydrated,
    setSessionRecovering,
  ]);

  return children;
}
