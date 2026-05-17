"use client";

import {
  Phone,
  Mic,
  Video,
  Signal,
} from "lucide-react";

import { motion } from "framer-motion";

const bars = Array.from(
  {
    length: 20,
  },
  (_, index) => ({
    id: index,
    low: 20 + (index % 5) * 4,
    high: 42 + (index % 7) * 9,
    duration: 0.8 + (index % 6) * 0.12,
  })
);

export default function LiveCallCard() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 60,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.7,
      }}
      className="relative mt-10 overflow-hidden rounded-[40px] border border-white/10 bg-black/30 p-8 shadow-[0_20px_80px_rgba(139,92,246,0.18)] backdrop-blur-3xl"
    >
      {/* BACKGROUND LIGHT */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.08] via-transparent to-blue-500/[0.08]" />

      {/* TOP */}
      <div className="relative flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-5">
          {/* PROFILE */}
          <motion.div
            animate={{
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
            className="relative h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-[0_10px_50px_rgba(139,92,246,0.45)]"
          >
            <div className="absolute inset-0 rounded-full bg-white/10" />

            {/* RING */}
            <motion.div
              animate={{
                scale: [1, 1.4],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute inset-0 rounded-full border border-purple-400"
            />
          </motion.div>

          {/* INFO */}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-white">
                Mayuri
              </h2>

              <motion.div
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
                className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]"
              />
            </div>

            <p className="mt-2 text-white/50">
              Connected • HD Voice • End-to-End Encrypted
            </p>

            {/* SIGNAL */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 w-fit">
              <Signal className="h-5 w-5 text-green-400" />

              <span className="text-sm text-white/70">
                Excellent Connection
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{
              scale: 1.08,
              y: -4,
            }}
            whileTap={{
              scale: 0.95,
            }}
            className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-white backdrop-blur-2xl"
          >
            <Mic className="h-6 w-6" />
          </motion.button>

          <motion.button
            whileHover={{
              scale: 1.08,
              y: -4,
            }}
            whileTap={{
              scale: 0.95,
            }}
            className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-white backdrop-blur-2xl"
          >
            <Video className="h-6 w-6" />
          </motion.button>

          <motion.button
            whileHover={{
              scale: 1.08,
              y: -4,
            }}
            whileTap={{
              scale: 0.95,
            }}
            className="flex h-20 w-20 items-center justify-center rounded-[30px] bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_10px_50px_rgba(239,68,68,0.45)]"
          >
            <Phone className="h-8 w-8 rotate-[135deg]" />
          </motion.button>
        </div>
      </div>

      {/* WAVEFORM */}
      <div className="relative mt-12 flex h-32 items-end justify-center gap-[6px] overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] px-8 py-6">
        {bars.map((bar) => (
          <motion.div
            key={bar.id}
            animate={{
              height: [
                `${bar.low}px`,
                `${bar.high}px`,
                `${bar.low}px`,
              ],
            }}
            transition={{
              duration: bar.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-[10px] rounded-full bg-gradient-to-t from-purple-500 via-violet-400 to-cyan-400"
          />
        ))}
      </div>
    </motion.div>
  );
}
