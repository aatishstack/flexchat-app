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
  const connectionVersion =
    useSocketStore(
      (state) =>
        state.connectionVersion
    );
  const onlineCount =
    useSocketStore(
      (state) =>
        state.onlineUsers.length
    );

  // Presence-only surface. We deliberately never render connection-status
  // verbiage (Connected / Connecting / Reconnecting / Syncing / Live Updates):
  // transient socket state must stay invisible to normal users.
  const status = useMemo(() => {
    return {
      dot: "bg-green-500 shadow-green-500/50",
      label:
        onlineCount === 1
          ? "1 person online"
          : `${onlineCount} people online`,
    };
  }, [
    onlineCount,
  ]);

  if (!isConnected || onlineCount <= 0) {
    return null;
  }

  const statusKey = [
    connectionVersion,
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
    </motion.div>
  );
}
