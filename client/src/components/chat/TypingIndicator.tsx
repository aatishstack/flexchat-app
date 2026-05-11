"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
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
      className="flex items-center gap-3"
    >
      {/* AVATAR */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 font-black">
        M
      </div>

      {/* BUBBLE */}
      <div className="flex items-center gap-2 rounded-[28px] rounded-bl-md border border-white/10 bg-black/30 px-5 py-4 backdrop-blur-3xl">
        {[0, 1, 2].map((dot) => (
          <motion.div
            key={dot}
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: dot * 0.15,
            }}
            className="h-3 w-3 rounded-full bg-cyan-300"
          />
        ))}
      </div>

      <p className="text-sm text-white/45">
        typing...
      </p>
    </motion.div>
  );
}