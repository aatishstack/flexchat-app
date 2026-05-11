"use client";

import { motion } from "framer-motion";

const actions = [
  "📞",
  "🎥",
  "🔍",
  "✨",
];

export default function QuickActions() {
  return (
    <div className="fixed bottom-36 right-6 z-[999] hidden flex-col gap-3 xl:flex">
      {actions.map((action, index) => (
        <motion.button
          key={index}
          whileHover={{
            scale: 1.08,
          }}
          whileTap={{
            scale: 0.92,
          }}
          initial={{
            opacity: 0,
            x: 40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            delay: index * 0.05,
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-3xl"
        >
          {action}
        </motion.button>
      ))}
    </div>
  );
}