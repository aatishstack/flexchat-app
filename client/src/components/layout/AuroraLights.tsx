"use client";

import { motion } from "framer-motion";

export default function AuroraLights() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {/* PURPLE */}
      <motion.div
        animate={{
          x: [0, 120, 0],
          y: [0, -80, 0],
          rotate: [0, 12, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
        }}
        className="absolute left-[-20%] top-[-20%] h-[700px] w-[700px] rounded-full bg-purple-500/10 blur-[160px]"
      />

      {/* CYAN */}
      <motion.div
        animate={{
          x: [0, -120, 0],
          y: [0, 100, 0],
          rotate: [0, -12, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
        }}
        className="absolute bottom-[-20%] right-[-20%] h-[700px] w-[700px] rounded-full bg-cyan-500/10 blur-[160px]"
      />

      {/* PINK */}
      <motion.div
        animate={{
          x: [0, 80, 0],
          y: [0, 60, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
        }}
        className="absolute left-[35%] top-[25%] h-[420px] w-[420px] rounded-full bg-pink-500/10 blur-[140px]"
      />
    </div>
  );
}