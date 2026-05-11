"use client";

import { motion } from "framer-motion";

type Props = {
  mine?: boolean;
};

const bars = [
  18, 26, 34, 20, 42, 28, 22, 38,
  24, 16, 32, 26,
];

export default function VoiceMessageBubble({
  mine,
}: Props) {
  return (
    <motion.div
      whileTap={{
        scale: 0.98,
      }}
      className={`flex max-w-[340px] items-center gap-4 rounded-[28px] px-5 py-4 shadow-[0_10px_40px_rgba(139,92,246,0.18)] ${
        mine
          ? "bg-gradient-to-r from-purple-600 to-cyan-500"
          : "border border-white/10 bg-black/30 backdrop-blur-3xl"
      }`}
    >
      {/* PLAY */}
      <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg">
        ▶
      </button>

      {/* WAVE */}
      <div className="flex flex-1 items-center gap-[3px]">
        {bars.map((height, index) => (
          <motion.div
            key={index}
            animate={{
              height: [
                height,
                height + 8,
                height,
              ],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.03,
            }}
            className="w-[4px] rounded-full bg-white/80"
            style={{
              height,
            }}
          />
        ))}
      </div>

      {/* META */}
      <div className="flex flex-col items-end">
        <p className="text-xs opacity-70">
          0:24
        </p>

        <button className="mt-1 rounded-lg bg-white/10 px-2 py-1 text-[10px]">
          1.5x
        </button>
      </div>
    </motion.div>
  );
}