"use client";

import { motion } from "framer-motion";

const actions = [
  "❤️",
  "🔥",
  "↩️",
  "📌",
  "⋯",
];

export default function MessageActions() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="absolute -top-14 right-0 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-3xl"
    >
      {actions.map((action, index) => (
        <motion.button
          key={index}
          whileHover={{
            scale: 1.15,
          }}
          whileTap={{
            scale: 0.92,
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-lg transition-all hover:bg-cyan-400/20"
        >
          {action}
        </motion.button>
      ))}
    </motion.div>
  );
}