"use client";

import { useEffect } from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { usePathname } from "next/navigation";
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
import { useConversationStore } from "@/stores/conversation.store";

const variantStyles = {
  success: {
    icon: CheckCircle2,
    iconClass:
      "border-[#7C4FF0]/20 bg-[#7C4FF0]/10 text-white shadow-[#7C4FF0]/10",
    glowClass:
      "from-[#7C4FF0]/[0.12] via-[#A78BFA]/[0.05] to-transparent",
    borderClass:
      "border-white/[0.08]",
  },
  error: {
    icon: ShieldAlert,
    iconClass:
      "border-red-500/25 bg-red-500/[0.16] text-white shadow-red-500/25",
    glowClass:
      "from-red-500/[0.18] via-transparent to-transparent",
    borderClass:
      "border-red-500/[0.18]",
  },
  info: {
    icon: Info,
    iconClass:
      "border-white/20 bg-white/10 text-white shadow-black/10",
    glowClass:
      "from-white/[0.08] via-transparent to-transparent",
    borderClass:
      "border-white/[0.12]",
  },
  warning: {
    icon: AlertTriangle,
    iconClass:
      "border-amber-500/25 bg-amber-500/[0.16] text-white shadow-amber-500/20",
    glowClass:
      "from-amber-500/[0.18] via-transparent to-transparent",
    borderClass:
      "border-amber-500/[0.18]",
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
      className={`pointer-events-auto relative w-[min(calc(100vw-1.5rem),310px)] overflow-hidden rounded-[22px] border ${variant.borderClass} bg-[#16161D]/[0.96] p-4 text-left shadow-[0_32px_64px_rgba(0,0,0,0.6)] backdrop-blur-3xl`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${variant.glowClass}`}
      />

      <div className="relative flex items-center gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-xl ${variant.iconClass}`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-bold text-white tracking-tight">
            {toast.title}
          </h3>

          {toast.message ? (
            <p className="mt-0.5 line-clamp-2 text-[12.5px] font-medium leading-relaxed text-white/40">
              {toast.message}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function LiveToast() {
  const pathname = usePathname();
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
  const activeConversationId = useConversationStore(
    (state) => state.activeConversationId,
  );
  const chatDetailOpen =
    pathname.startsWith("/chat") && !!activeConversationId;

  return (
    <div
      className={`pointer-events-none fixed inset-x-3 z-[300] flex flex-col-reverse items-center gap-2.5 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[calc(1rem+env(safe-area-inset-top))] sm:flex-col sm:items-end xl:right-[calc(var(--chat-right-rail-width,20rem)+1.25rem)] ${
        chatDetailOpen
          ? "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
      }`}
    >
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
