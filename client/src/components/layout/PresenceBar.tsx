"use client";

import { motion } from "framer-motion";

export default function PresenceBar() {
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
        delay: 1,
      }}
      className="fixed bottom-28 right-4 z-[9998] hidden w-[340px] overflow-hidden rounded-[32px] border border-white/10 bg-black/40 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-3xl xl:block"
    >
      {/* GLOW */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10" />

      <div className="relative z-10 p-5">
        {/* TOP */}
        <div className="flex items-center gap-4">
          {/* COVER */}
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-r from-purple-600 to-cyan-500 text-3xl shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              🎵
            </div>

            {/* LIVE */}
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-400 text-[10px] font-black text-black">
              LIVE
            </div>
          </div>

          {/* INFO */}
          <div className="flex-1">
            <p className="text-sm text-green-300">
              Listening now
            </p>

            <h2 className="mt-1 text-xl font-black">
              Midnight City
            </h2>

            <p className="mt-1 text-sm text-white/45">
              FlexWave • Synth Edition
            </p>
          </div>
        </div>

        {/* WAVE */}
        <div className="mt-6 flex items-end gap-1">
          {[18, 32, 22, 38, 26, 42, 28, 36, 20, 34].map(
            (height, index) => (
              <motion.div
                key={index}
                animate={{
                  height: [
                    height,
                    height + 12,
                    height,
                  ],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: index * 0.08,
                }}
                className="w-2 rounded-full bg-gradient-to-t from-purple-400 to-cyan-400"
                style={{
                  height,
                }}
              />
            )
          )}
        </div>

        {/* USERS */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex -space-x-3">
            {["M", "A", "N", "F"].map(
              (user, index) => (
                <div
                  key={index}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#050816] bg-gradient-to-r from-purple-600 to-cyan-500 text-sm font-black"
                >
                  {user}
                </div>
              )
            )}
          </div>

          <p className="text-sm text-white/45">
            14 friends listening
          </p>
        </div>
      </div>
    </motion.div>
  );
}