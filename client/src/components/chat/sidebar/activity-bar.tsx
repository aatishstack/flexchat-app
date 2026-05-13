"use client";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  useEffect,
  useState,
} from "react";

export default function ActivityBar() {
  const [visible, setVisible] =
    useState(true);

  useEffect(() => {
    const timer =
      setTimeout(() => {
        setVisible(false);
      }, 2200);

    return () =>
      clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -20,
          }}
          className="fixed left-1/2 top-5 z-[150] flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-[#0B111C]/90 px-6 py-3 shadow-2xl backdrop-blur-xl"
        >
          <div className="h-3 w-3 animate-pulse rounded-full bg-green-500 shadow-lg shadow-green-500/50" />

          <p className="text-sm font-medium text-white">
            12 users active now
          </p>

          <div className="h-5 w-px bg-white/10" />

          <p className="text-sm text-zinc-400">
            FlexChat Realtime Connected
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}