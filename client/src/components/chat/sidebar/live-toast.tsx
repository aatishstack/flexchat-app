"use client";

import { useEffect } from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { Sparkles } from "lucide-react";

import { useToastStore } from "@/store/toast-store";

export default function LiveToast() {
  const toasts =
    useToastStore(
      (state) =>
        state.toasts
    );
  const removeToast =
    useToastStore(
      (state) =>
        state.removeToast
    );

  useEffect(() => {
    const timers =
      toasts.map((toast) =>
        setTimeout(() => {
          removeToast(toast.id);
        }, 4000)
      );

    return () => {
      timers.forEach(
        clearTimeout
      );
    };
  }, [
    toasts,
    removeToast,
  ]);

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[200] flex flex-col gap-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{
              opacity: 0,
              y: -20,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -20,
              scale: 0.9,
            }}
            className="pointer-events-auto w-[min(calc(100vw-1.5rem),340px)] rounded-3xl border border-white/10 bg-[#0B111C]/95 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white">
                <Sparkles size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-white">
                  {toast.title}
                </h3>

                <p className="mt-1 text-sm text-zinc-400">
                  {toast.message}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
