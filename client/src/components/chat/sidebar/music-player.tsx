"use client";

import {
  Pause,
  Play,
  Music2,
} from "lucide-react";

import { motion } from "framer-motion";

import { useMusicStore } from "@/store/music-store";

export default function MusicPlayer() {
  const playing =
    useMusicStore(
      (state) =>
        state.playing
    );

  const song =
    useMusicStore(
      (state) =>
        state.song
    );

  const artist =
    useMusicStore(
      (state) =>
        state.artist
    );

  const toggle =
    useMusicStore(
      (state) =>
        state.toggle
    );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 40,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="fixed bottom-28 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-5 rounded-3xl border border-white/10 bg-[#0B111C]/95 px-6 py-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30">
        <Music2 size={24} />
      </div>

      <div>
        <h3 className="font-medium text-white">
          {song}
        </h3>

        <p className="text-sm text-zinc-500">
          {artist}
        </p>
      </div>

      <button
        onClick={
          toggle
        }
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white"
      >
        {playing ? (
          <Pause
            size={18}
          />
        ) : (
          <Play
            size={18}
          />
        )}
      </button>
    </motion.div>
  );
}
