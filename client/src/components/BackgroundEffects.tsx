"use client";

import { motion } from "framer-motion";

export default function BackgroundEffects() {
  return (
    <>
      {/* Wallpaper */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1520034475321-cbe63696469a?q=80&w=1600')",
        }}
      />

      {/* Main Glow */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat:
            Number.POSITIVE_INFINITY,
        }}
        className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-sky-700/24 blur-[140px]"
      />

      {/* Secondary Glow */}
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
        }}
        transition={{
          duration: 10,
          repeat:
            Number.POSITIVE_INFINITY,
        }}
        className="absolute bottom-[-120px] right-[-120px] h-[420px] w-[420px] rounded-full bg-blue-700/20 blur-[140px]"
      />

      {/* Center Orb */}
      <motion.div
        animate={{
          y: [0, -20, 0],
        }}
        transition={{
          duration: 6,
          repeat:
            Number.POSITIVE_INFINITY,
        }}
        className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[120px]"
      />

      {/* Noise Texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-soft-light">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "url('https://grainy-gradients.vercel.app/noise.svg')",
          }}
        />
      </div>
    </>
  );
}
