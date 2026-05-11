"use client";

import { motion } from "framer-motion";

const emojis = [
  "❤️",
  "🔥",
  "😂",
  "😈",
  "😭",
  "🚀",
  "⚡",
];

export default function ReactionPicker() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.8,
        y: 10,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.8,
      }}
      className="absolute -top-16 left-0 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-3xl"
    >
      {emojis.map((emoji, index) => (
        <motion.button
          key={index}
          whileHover={{
            scale: 1.35,
            y: -6,
          }}
          whileTap={{
            scale: 0.9,
          }}
          className="text-2xl"
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
}