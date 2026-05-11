"use client";

import { motion } from "framer-motion";

export default function AIOrb() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.7,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -10, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
      }}
      className="fixed bottom-28 left-1/2 z-[9998] hidden -translate-x-1/2 xl:block"
    >
      {/* OUTER GLOW */}
      <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-[40px]" />

      {/* RING */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-[-10px] rounded-full border border-cyan-400/30"
      />

      {/* CORE */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-3xl"
      >
        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.8)]" />
      </motion.div>
    </motion.div>
  );
}