"use client";

import { motion } from "framer-motion";

export default function CyberScanner() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden">
      {/* HORIZONTAL SCAN */}
      <motion.div
        animate={{
          y: ["-10%", "110%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent blur-2xl"
      />

      {/* VERTICAL LIGHT */}
      <motion.div
        animate={{
          x: ["-10%", "110%"],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent blur-2xl"
      />

      {/* GRID OVERLAY */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:90px_90px]" />
    </div>
  );
}