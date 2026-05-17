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
          className="fixed left-1/2 top-[calc(1rem+env(safe-area-inset-top))] z-[130] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-[#0B111C]/90 px-4 py-3 shadow-2xl backdrop-blur-xl sm:gap-4 sm:px-6"
        >
          <div className="h-3 w-3 animate-pulse rounded-full bg-green-500 shadow-lg shadow-green-500/50" />

          <p className="text-sm font-medium text-white">
            12 users active now
          </p>

          <div className="hidden h-5 w-px bg-white/10 sm:block" />

          <p className="hidden text-sm text-zinc-400 sm:block">
            FlexChat Realtime Connected
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
