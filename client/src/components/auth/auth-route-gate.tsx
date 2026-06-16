"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { clearClientSession } from "@/lib/session-cleanup";
import { SESSION_RETRY_EVENT } from "@/lib/session-events";
import { TOKEN_CHANGE_EVENT, TOKEN_KEY, tokenStorage } from "@/lib/token";

const protectedPrefixes = [
  "/chat",
  "/calls",
  "/contacts",
  "/discover",
  "/friends",
  "/notifications",
  "/privacy",
  "/profile",
  "/settings",
  "/status",
];

const authPrefixes = [
  "/auth",
  "/register",
  "/verify",
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0C0C10] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
        className="absolute h-[400px] w-[400px] rounded-full bg-[#7C4FF0]/10 blur-[120px]"
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative h-20 w-20">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 rounded-[22px] border-2 border-[#7C4FF0]/20 border-t-[#7C4FF0]"
          />
          <div className="absolute inset-[3px] overflow-hidden rounded-[19px] bg-[#16161D]">
            <img 
              src="/logo.jpeg" 
              alt="" 
              className="h-full w-full object-cover opacity-80" 
            />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-[26px] font-extrabold tracking-tight">
            <span className="text-white">Flex</span>
            <span className="text-[#7C4FF0]">Chat</span>
          </h1>
          <p className="mt-3 text-[15px] font-medium text-[#7C4FF0]/60">
            Restoring your secure session
          </p>
        </div>
      </div>
    </div>
  );
}

function SessionRecoveryScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0C0C10] px-6 text-white">
      <div className="w-full max-w-sm rounded-[28px] border border-white/[0.06] bg-[#16161D] p-10 text-center shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        <div className="relative mx-auto h-16 w-16 mb-8">
          <div className="absolute inset-0 animate-spin rounded-2xl border-2 border-[#7C4FF0]/20 border-t-[#7C4FF0]" />
          <div className="absolute inset-[2.5px] rounded-[14px] bg-[#0C0C10] flex items-center justify-center overflow-hidden">
             <img src="/logo.jpeg" alt="" className="h-full w-full object-cover opacity-50" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Restoring your session
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-white/40">
          FlexChat cannot reach the API right now. Your sign-in is preserved
          while we reconnect safely.
        </p>
        
        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new Event(SESSION_RETRY_EVENT),
              );
            }}
            className="flex h-13 items-center justify-center rounded-[18px] bg-[#7C4FF0] text-[15px] font-bold text-white shadow-xl shadow-[#7C4FF0]/20 transition active:scale-95"
          >
            Retry now
          </button>
          <button
            type="button"
            onClick={() => {
              clearClientSession();
            }}
            className="flex h-13 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-[15px] font-bold text-white/80 transition hover:bg-white/[0.06] active:scale-95"
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
  const lastGuardLogRef = useRef("");

  const protectedPath =
    isProtectedPath(pathname);
  const authPath =
    isAuthPath(pathname);

  useEffect(() => {
    function syncTokenState() {
      setHasStoredToken(
        tokenStorage.exists()
      );
      console.info("[AUTH] token storage observed by route guard", {
        hasStoredToken: tokenStorage.exists(),
      });
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
    const status = !isHydrated
      ? "loading"
      : isAuthenticated
        ? "authenticated"
        : "unauthenticated";
    const rejectedReason =
      protectedPath &&
      isHydrated &&
      !isAuthenticated &&
      !hasStoredToken
        ? "missing_token"
        : protectedPath &&
            isHydrated &&
            !isAuthenticated &&
            hasStoredToken
          ? "validating_stored_token"
          : authPath &&
              hasStoredToken &&
              !isAuthenticated
            ? "validating_stored_token"
            : null;
    const signature = JSON.stringify({
      pathname,
      status,
      protectedPath,
      authPath,
      hasStoredToken,
      isSessionRecovering,
      rejectedReason,
    });

    if (lastGuardLogRef.current === signature) {
      return;
    }

    lastGuardLogRef.current = signature;
    console.info("[AUTH] guard state", {
      pathname,
      status,
      protectedPath,
      authPath,
      hasStoredToken,
      isSessionRecovering,
      rejectedReason,
    });
  }, [
    authPath,
    hasStoredToken,
    isAuthenticated,
    isHydrated,
    isSessionRecovering,
    pathname,
    protectedPath,
  ]);

  useEffect(() => {
    if (
      authPath &&
      isHydrated &&
      isAuthenticated
    ) {
      console.info("[ROUTER] redirect executing", {
        from: pathname,
        to: "/chat",
        reason: "authenticated_on_auth_route",
      });
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

    console.warn("[AUTH] auth rejected reason", {
      pathname,
      reason: "missing_token",
    });
    console.info("[ROUTER] redirect executing", {
      from: pathname,
      to: "/auth",
      reason: "protected_route_missing_auth",
    });
    router.replace("/auth");
  }, [
    isAuthenticated,
    isHydrated,
    protectedPath,
    authPath,
    hasStoredToken,
    pathname,
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

  if (authPath && isAuthenticated) {
    return null;
  }

  if (authPath && hasStoredToken) {
    return <RouteGateLoader />;
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
