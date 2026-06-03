"use client";

import { motion } from "framer-motion";

import {
  useMemo,
} from "react";

import { useSocketStore } from "@/store/socket-store";

export default function ActivityBar() {
  const isConnected =
    useSocketStore(
      (state) =>
        state.isConnected
    );
  const isConnecting =
    useSocketStore(
      (state) =>
        state.isConnecting
    );
  const connectionVersion =
    useSocketStore(
      (state) =>
        state.connectionVersion
    );
  const connectionError =
    useSocketStore(
      (state) =>
        state.connectionError
    );
  const onlineCount =
    useSocketStore(
      (state) =>
        state.onlineUsers.length
    );

  const status = useMemo(() => {
    if (connectionError) {
      return {
        dot: "bg-red-400 shadow-red-500/50",
        label:
          "Realtime connection issue",
        detail:
          connectionError,
      };
    }

    if (
      isConnecting &&
      !isConnected
    ) {
      return {
        dot: "bg-amber-300 shadow-amber-500/50",
        label:
          "Reconnecting",
        detail:
          "Syncing live updates",
      };
    }

    return {
      dot: "bg-green-500 shadow-green-500/50",
      label:
        onlineCount === 1
          ? "1 user online"
          : `${onlineCount} users online`,
      detail:
        "Realtime connected",
    };
  }, [
    connectionError,
    isConnected,
    isConnecting,
    onlineCount,
  ]);

  const statusKey = [
    connectionError,
    connectionVersion,
    isConnected,
    isConnecting,
    onlineCount,
  ].join(":");

  return (
    <motion.div
      key={statusKey}
      initial={{
        opacity: 0,
        y: -20,
      }}
      animate={{
        opacity: [
          0,
          1,
          1,
          0,
        ],
        y: [
          -20,
          0,
          0,
          -20,
        ],
      }}
      transition={{
        duration: 2.6,
        times: [
          0,
          0.12,
          0.86,
          1,
        ],
      }}
      className="fc-modal pointer-events-none fixed left-1/2 top-[calc(0.75rem+env(safe-area-inset-top))] z-[130] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-3 sm:gap-4 sm:px-6 sm:backdrop-blur-xl"
    >
      <div
        className={`h-3 w-3 rounded-full shadow-lg motion-safe:animate-pulse ${status.dot}`}
      />

      <p className="text-sm font-medium text-[var(--fc-theme-text)]">
        {status.label}
      </p>

      <div className="hidden h-5 w-px bg-[var(--fc-divider)] sm:block" />

      <p className="fc-muted hidden max-w-[320px] truncate text-sm sm:block">
        {status.detail}
      </p>
    </motion.div>
  );
}
