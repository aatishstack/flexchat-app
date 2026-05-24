"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { clearClientSession } from "@/lib/session-cleanup";
import { SESSION_RETRY_EVENT } from "@/lib/session-events";
import { TOKEN_CHANGE_EVENT, TOKEN_KEY, tokenStorage } from "@/lib/token";

const protectedPrefixes = [
  "/chat",
  "/profile",
  "/settings",
];

const authPrefixes = [
  "/auth",
  "/register",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
  );
}

function isAuthPath(pathname: string) {
  return authPrefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
  );
}

function RouteGateLoader() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B14] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
        }}
        className="absolute h-[360px] w-[360px] rounded-full bg-purple-500/20 blur-[110px]"
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          className="h-16 w-16 rounded-2xl border border-purple-500/30 border-t-purple-300 bg-white/[0.04] shadow-2xl shadow-purple-950/30"
        />

        <div className="text-center">
          <h1 className="text-xl font-semibold">
            FlexChat
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Restoring your secure session
          </p>
        </div>
      </div>
    </div>
  );
}

function SessionRecoveryScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070B14] px-6 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/30">
        <div className="mx-auto h-12 w-12 animate-spin rounded-xl border border-amber-300/30 border-t-amber-200" />
        <h1 className="mt-6 text-xl font-semibold">
          Restoring your session
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          FlexChat cannot reach the API right now. Your sign-in is preserved
          while we reconnect safely.
        </p>
        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new Event(SESSION_RETRY_EVENT),
              );
            }}
            className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold transition hover:bg-purple-500"
          >
            Retry now
          </button>
          <button
            type="button"
            onClick={() => {
              clearClientSession();
            }}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthRouteGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isAuthenticated,
    isHydrated,
    isSessionRecovering,
  } = useAuth();
  const [hasStoredToken, setHasStoredToken] =
    useState(() => tokenStorage.exists());

  const protectedPath =
    isProtectedPath(pathname);
  const authPath =
    isAuthPath(pathname);

  useEffect(() => {
    function syncTokenState() {
      setHasStoredToken(
        tokenStorage.exists()
      );
    }

    function handleStorage(
      event: StorageEvent
    ) {
      if (event.key !== TOKEN_KEY) {
        return;
      }

      syncTokenState();
    }

    window.addEventListener(
      "storage",
      handleStorage
    );
    window.addEventListener(
      TOKEN_CHANGE_EVENT,
      syncTokenState
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
      window.removeEventListener(
        TOKEN_CHANGE_EVENT,
        syncTokenState
      );
    };
  }, []);

  useEffect(() => {
    if (
      authPath &&
      isHydrated &&
      isAuthenticated
    ) {
      router.replace("/chat");
      return;
    }

    if (
      !protectedPath ||
      !isHydrated ||
      isAuthenticated ||
      hasStoredToken
    ) {
      return;
    }

    router.replace("/auth");
  }, [
    isAuthenticated,
    isHydrated,
    protectedPath,
    authPath,
    hasStoredToken,
    router,
  ]);

  const isRecoveringStoredSession =
    isHydrated &&
    isSessionRecovering &&
    hasStoredToken &&
    !isAuthenticated;

  if (isRecoveringStoredSession) {
    return <SessionRecoveryScreen />;
  }

  if (authPath && (isAuthenticated || hasStoredToken)) {
    return null;
  }

  if (!protectedPath) {
    return children;
  }

  if (!isHydrated || (!isAuthenticated && hasStoredToken)) {
    return <RouteGateLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
