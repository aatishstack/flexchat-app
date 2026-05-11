"use client";

import { motion } from "framer-motion";

export default function MusicPresence() {
  return (
    <motion.div
      initial={{
        y: 120,
        opacity: 0,
      }}
      animate={{
        y: 0,
        opacity: 1,
      }}
      transition={{
        delay: 0.5,
      }}
      className="fixed bottom-28 left-1/2 z-[999] hidden -translate-x-1/2 overflow-hidden rounded-[32px] border border-white/10 bg-black/30 shadow-[0_20px_120px_rgba(0,0,0,0.45)] backdrop-blur-3xl xl:block"
    >
      {/* GLOW */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-cyan-500/10" />

      <div className="relative z-10 flex items-center gap-5 px-6 py-4">
        {/* COVER */}
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-r from-purple-600 to-cyan-500 text-2xl">
          🎵
        </div>

        {/* INFO */}
        <div>
          <p className="text-sm text-cyan-300">
            LIVE AUDIO STATUS
          </p>

          <h3 className="mt-1 font-black">
            Midnight Echoes
          </h3>

          <p className="text-sm text-white/50">
            FlexWave Engine
          </p>
        </div>

        {/* WAVES */}
        <div className="ml-4 flex items-end gap-[4px]">
          {[24, 36, 18, 42, 26].map(
            (height, index) => (
              <motion.div
                key={index}
                animate={{
                  height: [
                    height,
                    height + 14,
                    height,
                  ],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.08,
                }}
                className="w-[5px] rounded-full bg-gradient-to-t from-cyan-400 to-purple-500"
                style={{
                  height,
                }}
              />
            )
          )}
        </div>

        {/* CONTROLS */}
        <div className="ml-4 flex items-center gap-3">
          {["⏮️", "⏸️", "⏭️"].map(
            (icon, index) => (
              <motion.button
                key={index}
                whileHover={{
                  scale: 1.08,
                }}
                whileTap={{
                  scale: 0.92,
                }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]"
              >
                {icon}
              </motion.button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}