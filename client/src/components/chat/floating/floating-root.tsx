"use client";

import DynamicMusicIsland from "./dynamic-music-island";

import VoiceRoomOrb from "./voice-room-orb";

import {
  motion,
} from "framer-motion";

import {
  useEffect,
  useState,
} from "react";

type Props = {
  aiOpen: boolean;

  setAiOpen: (
    value: boolean
  ) => void;

  notificationsOpen: boolean;

  setNotificationsOpen: (
    value: boolean
  ) => void;
};

export default function FloatingRoot({
  aiOpen,
  setAiOpen,
  notificationsOpen,
  setNotificationsOpen,
}: Props) {
  const [
    position,
    setPosition,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    mounted,
    setMounted,
  ] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  function snapToEdge(
    x: number,
    y: number
  ) {
    const screenWidth =
      window.innerWidth;

    const snappedX =
      x >
      screenWidth / 2 - 100
        ? 0
        : -20;

    setPosition({
      x: snappedX,
      y,
    });
  }

  return (
    <motion.div
      drag
      dragMomentum
      dragElastic={0.12}
      whileDrag={{
        scale: 1.04,
      }}
      dragTransition={{
        bounceStiffness: 180,
        bounceDamping: 18,
      }}
      onDragEnd={(
        _,
        info
      ) => {
        snapToEdge(
          info.point.x,
          info.point.y
        );
      }}
      animate={{
        x: position.x,
        y: position.y,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 22,
      }}
      className="fixed bottom-8 right-4 z-[140] flex flex-col items-center gap-4 xl:right-[400px]"
    >
      {/* VOICE ROOM */}
      <div>
        <VoiceRoomOrb />
      </div>

      {/* MUSIC */}
      <div>
        <DynamicMusicIsland />
      </div>

      {/* NOTIFICATION */}
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
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-2xl shadow-2xl backdrop-blur-2xl transition hover:bg-white/[0.1]"
      >
        🔔

        <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/60" />
      </motion.button>

      {/* AI */}
      <motion.button
        whileHover={{
          scale: 1.05,
        }}
        whileTap={{
          scale: 0.96,
        }}
        onClick={() =>
          setAiOpen(
            !aiOpen
          )
        }
        className={
          aiOpen
            ? "flex h-14 w-14 items-center justify-center rounded-full border border-purple-400/40 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-indigo-600 text-2xl text-white shadow-2xl shadow-purple-600/40 backdrop-blur-2xl transition"
            : "flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-2xl text-white shadow-2xl backdrop-blur-2xl transition hover:bg-white/[0.1]"
        }
      >
        ✨
      </motion.button>
    </motion.div>
  );
}