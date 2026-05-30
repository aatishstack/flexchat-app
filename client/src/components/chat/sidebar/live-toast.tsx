"use client";

import { useEffect } from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";

import {
  Toast,
  useToastStore,
} from "@/store/toast-store";

const variantStyles = {
  success: {
    icon: CheckCircle2,
    iconClass:
      "border-[#7CC5FF]/20 bg-[#2481CC]/15 text-[#DDF2FF] shadow-[#2481CC]/10",
    glowClass:
      "from-[#2481CC]/[0.14] via-[#7CC5FF]/[0.06] to-transparent",
    borderClass:
      "border-sky-200/[0.16]",
  },
  error: {
    icon: ShieldAlert,
    iconClass:
      "border-red-300/25 bg-red-500/[0.16] text-red-100 shadow-red-500/25",
    glowClass:
      "from-red-400/[0.20] via-sky-400/[0.08] to-transparent",
    borderClass:
      "border-red-300/[0.18]",
  },
  info: {
    icon: Info,
    iconClass:
      "border-[#7CC5FF]/20 bg-[#2481CC]/[0.14] text-[#DDF2FF] shadow-[#2481CC]/10",
    glowClass:
      "from-[#2481CC]/[0.16] via-[#7CC5FF]/[0.07] to-transparent",
    borderClass:
      "border-sky-200/[0.16]",
  },
  warning: {
    icon: AlertTriangle,
    iconClass:
      "border-amber-200/25 bg-amber-400/[0.16] text-amber-100 shadow-amber-500/20",
    glowClass:
      "from-amber-300/[0.18] via-sky-400/[0.08] to-transparent",
    borderClass:
      "border-amber-200/[0.18]",
  },
};

function ToastCard({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onRemove(toast.id);
    }, toast.durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    onRemove,
    toast.durationMs,
    toast.id,
  ]);

  const variant =
    variantStyles[toast.variant];
  const Icon = variant.icon;

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 12,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: 10,
        scale: 0.98,
      }}
      transition={{
        type: "spring",
        stiffness: 360,
        damping: 34,
        mass: 0.8,
      }}
      className={`pointer-events-auto relative w-[min(calc(100vw-1.5rem),340px)] overflow-hidden rounded-[18px] border ${variant.borderClass} bg-[#0B1520]/[0.92] p-3.5 text-left shadow-[0_16px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${variant.glowClass}`}
      />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border shadow-xl ${variant.iconClass}`}
        >
          <Icon size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">
            {toast.title}
          </h3>

          {toast.message ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-300/85">
              {toast.message}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

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

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[300] flex flex-col-reverse items-center gap-3 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[calc(1rem+env(safe-area-inset-top))] sm:flex-col sm:items-end xl:right-[calc(var(--chat-right-rail-width,20rem)+1.25rem)]">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
