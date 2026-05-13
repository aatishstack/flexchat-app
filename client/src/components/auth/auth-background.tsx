"use client";

import { motion } from "framer-motion";

export default function AuthBackground() {
  return (
    <>
      {/* Main Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.20),transparent_35%)]" />

      {/* Animated Orbs */}
      <motion.div
        animate={{
          y: [0, -20, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 8,
          ease: "easeInOut",
        }}
        className="absolute left-[-120px] top-[-120px] h-[340px] w-[340px] rounded-full bg-purple-600/10 blur-3xl"
      />

      <motion.div
        animate={{
          y: [0, 25, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 10,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-180px] right-[-140px] h-[360px] w-[360px] rounded-full bg-fuchsia-500/10 blur-3xl"
      />

      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px]" />

      {/* Noise */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light [background-image:url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </>
  );
}