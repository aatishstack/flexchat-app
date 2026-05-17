"use client";

import { useEffect } from "react";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

const protectedPrefixes = [
  "/chat",
  "/profile",
  "/settings",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
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
  } = useAuth();

  const protectedPath =
    isProtectedPath(pathname);

  useEffect(() => {
    if (
      !protectedPath ||
      !isHydrated ||
      isAuthenticated
    ) {
      return;
    }

    router.replace("/auth");
  }, [
    isAuthenticated,
    isHydrated,
    protectedPath,
    router,
  ]);

  if (!protectedPath) {
    return children;
  }

  if (!isHydrated) {
    return <RouteGateLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
