"use client";

import { motion } from "framer-motion";

export default function EdgeLighting() {
  return (
    <>
      {/* TOP */}
      <motion.div
        animate={{
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
        }}
        className="pointer-events-none fixed left-0 top-0 z-[3] h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent blur-sm"
      />

      {/* BOTTOM */}
      <motion.div
        animate={{
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
        }}
        className="pointer-events-none fixed bottom-0 left-0 z-[3] h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent blur-sm"
      />

      {/* LEFT */}
      <motion.div
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
        }}
        className="pointer-events-none fixed left-0 top-0 z-[3] h-full w-[2px] bg-gradient-to-b from-transparent via-purple-500 to-transparent blur-sm"
      />

      {/* RIGHT */}
      <motion.div
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
        }}
        className="pointer-events-none fixed right-0 top-0 z-[3] h-full w-[2px] bg-gradient-to-b from-transparent via-cyan-500 to-transparent blur-sm"
      />
    </>
  );
}