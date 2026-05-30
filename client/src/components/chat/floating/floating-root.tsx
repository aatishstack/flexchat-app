"use client";

import type { CSSProperties } from "react";

import { Bell } from "lucide-react";

import {
  motion,
  useReducedMotion,
} from "framer-motion";

import { useNotificationStore } from "@/store/notification-store";

type Props = {
  notificationsOpen: boolean;
  setNotificationsOpen: (value: boolean) => void;
};

export default function FloatingRoot({
  notificationsOpen,
  setNotificationsOpen,
}: Props) {
  const reducedMotion =
    useReducedMotion();
  const unreadCount =
    useNotificationStore(
      (state) =>
        state.notifications.filter(
          (notification) =>
            !notification.read
        ).length
    );
  const floatingOffset =
    notificationsOpen
      ? "calc(var(--chat-right-rail-width,20rem) + var(--chat-notification-panel-width,21.25rem) + (var(--chat-panel-gap,1rem) * 2))"
      : "calc(var(--chat-right-rail-width,20rem) + 1.5rem)";

  if (notificationsOpen) {
    return null;
  }

  return (
    <div
      style={
        {
          "--chat-floating-offset":
            floatingOffset,
        } as CSSProperties
      }
      className="pointer-events-none fixed inset-x-0 bottom-[var(--chat-floating-safe-bottom,calc(5.75rem+env(safe-area-inset-bottom)))] z-[140] flex justify-center px-3 lg:bottom-5 lg:pb-[max(env(safe-area-inset-bottom),0px)] xl:justify-end xl:pr-[var(--chat-floating-offset)]"
    >
      <motion.div
        initial={
          reducedMotion
            ? false
            : {
                opacity: 0,
                y: 18,
                scale: 0.96,
              }
        }
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          type: "spring",
          stiffness:
            reducedMotion
              ? 180
              : 260,
          damping:
            reducedMotion
              ? 30
              : 26,
        }}
        className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-[24px] border border-white/10 bg-[#08111f]/[0.92] p-2 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-3xl sm:gap-3 sm:rounded-[28px]"
      >
        <motion.button
          whileHover={
            reducedMotion
              ? undefined
              : {
                  scale: 1.05,
                }
          }
          whileTap={
            reducedMotion
              ? undefined
              : {
                  scale: 0.96,
                }
          }
          onClick={() =>
            setNotificationsOpen(
              !notificationsOpen
            )
          }
          aria-label="Notifications"
          className={
            notificationsOpen
              ? "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/35 bg-gradient-to-br from-[#2481CC] to-[#2F8ED8] text-white shadow-2xl shadow-sky-700/25 backdrop-blur-2xl transition sm:h-14 sm:w-14"
              : "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-xl backdrop-blur-2xl transition hover:bg-white/[0.1] sm:h-14 sm:w-14"
          }
        >
          <Bell size={20} />

          {unreadCount ? (
            <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-red-500/50">
              {unreadCount > 9
                ? "9+"
                : unreadCount}
            </span>
          ) : null}
        </motion.button>
      </motion.div>
    </div>
  );
}
