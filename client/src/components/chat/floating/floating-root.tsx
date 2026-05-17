"use client";

import {
  Bell,
  Sparkles,
} from "lucide-react";

import { motion } from "framer-motion";

import DynamicMusicIsland from "./dynamic-music-island";
import MiniCallIsland from "./mini-call-island";
import VoiceRoomOrb from "./voice-room-orb";

type Props = {
  aiOpen: boolean;
  setAiOpen: (value: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (value: boolean) => void;
};

export default function FloatingRoot({
  aiOpen,
  setAiOpen,
  notificationsOpen,
  setNotificationsOpen,
}: Props) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[140] flex justify-center px-3 lg:bottom-5 lg:pb-[max(env(safe-area-inset-bottom),0px)] xl:justify-end ${
        aiOpen
          ? "xl:pr-[404px]"
          : "xl:pr-6"
      }`}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 18,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 26,
        }}
        className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-[24px] border border-white/10 bg-[#08111f]/92 p-2 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-3xl sm:gap-3 sm:rounded-[28px]"
      >
        <MiniCallIsland />
        <VoiceRoomOrb />
        <DynamicMusicIsland />

        <motion.button
          whileHover={{
            scale: 1.05,
          }}
          whileTap={{
            scale: 0.96,
          }}
          onClick={() =>
            setNotificationsOpen(
              !notificationsOpen
            )
          }
          aria-label="Notifications"
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-xl backdrop-blur-2xl transition hover:bg-white/[0.1] sm:h-14 sm:w-14"
        >
          <Bell size={20} />

          <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/60" />
        </motion.button>

        <motion.button
          whileHover={{
            scale: 1.05,
          }}
          whileTap={{
            scale: 0.96,
          }}
          onClick={() =>
            setAiOpen(!aiOpen)
          }
          aria-label="Flex AI"
          className={
            aiOpen
              ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-400/40 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-2xl shadow-purple-600/40 backdrop-blur-2xl transition sm:h-14 sm:w-14"
              : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-xl backdrop-blur-2xl transition hover:bg-white/[0.1] sm:h-14 sm:w-14"
          }
        >
          <Sparkles size={20} />
        </motion.button>
      </motion.div>
    </div>
  );
}
