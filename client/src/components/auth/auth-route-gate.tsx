"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
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

function SessionReconnectBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-[10010] flex justify-center px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <p className="rounded-full border border-amber-300/25 bg-[#111827]/95 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl shadow-black/30 backdrop-blur-xl">
        Reconnecting...
      </p>
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

  if (
    authPath &&
    (isAuthenticated ||
      hasStoredToken)
  ) {
    return null;
  }

  if (!protectedPath) {
    return children;
  }

  if (!isHydrated || (!isAuthenticated && hasStoredToken)) {
    if (
      isHydrated &&
      isSessionRecovering &&
      hasStoredToken
    ) {
      return (
        <>
          <SessionReconnectBanner />
          {children}
        </>
      );
    }

    return <RouteGateLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
