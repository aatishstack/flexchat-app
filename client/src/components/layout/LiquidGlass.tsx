"use client";

import { motion } from "framer-motion";

export default function LiquidGlass() {
  return (
    <>
      {/* TOP GLASS */}
      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
        }}
        className="pointer-events-none fixed left-[10%] top-[8%] z-[2] hidden h-[220px] w-[220px] rounded-full border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-[40px] xl:block"
      />

      {/* CENTER GLASS */}
      <motion.div
        animate={{
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
        }}
        className="pointer-events-none fixed bottom-[18%] right-[12%] z-[2] hidden h-[300px] w-[300px] rounded-full border border-white/10 bg-white/[0.025] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] backdrop-blur-[50px] xl:block"
      />

      {/* SMALL REFLECTION */}
      <motion.div
        animate={{
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
        }}
        className="pointer-events-none fixed right-[22%] top-[18%] z-[2] hidden h-24 w-24 rounded-full bg-white/[0.03] blur-[20px] xl:block"
      />
    </>
  );
}