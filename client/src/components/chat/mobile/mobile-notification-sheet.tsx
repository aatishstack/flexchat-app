"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import { X } from "lucide-react";

import NotificationPanel from "@/components/chat/sidebar/notification-panel";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MobileNotificationSheet({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={onClose}
            className="fixed inset-0 z-[230] bg-black/60 backdrop-blur-md xl:hidden"
          />

          <motion.div
            drag="y"
            dragConstraints={{
              top: 0,
              bottom: 0,
            }}
            onDragEnd={(
              _,
              info
            ) => {
              if (
                info.offset.y >
                120
              ) {
                onClose();
              }
            }}
            initial={{
              y: "100%",
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: "100%",
            }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 26,
            }}
            className="fixed bottom-0 left-0 right-0 z-[240] flex h-[min(82dvh,720px)] max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] flex-col overflow-hidden rounded-t-[32px] border-t border-[var(--fc-app-border)] bg-[var(--fc-app-surface)] shadow-2xl shadow-black/50 backdrop-blur-3xl xl:hidden"
          >
            <div className="relative flex h-14 shrink-0 items-center justify-center">
              <div className="h-1.5 w-16 rounded-full bg-white/20" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white"
                aria-label="Close notifications"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <NotificationPanel
                onClose={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
