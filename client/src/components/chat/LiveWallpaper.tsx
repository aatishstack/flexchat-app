"use client";

import { motion } from "framer-motion";

export default function LiveWallpaper() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* BASE */}
      <div className="absolute inset-0 bg-[#050816]" />

      {/* MESH */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_30%)]" />

      {/* ORB 1 */}
      <motion.div
        animate={{
          x: [0, 120, 0],
          y: [0, 80, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute left-[-140px] top-[-120px] h-[420px] w-[420px] rounded-full bg-purple-600/20 blur-[120px]"
      />

      {/* ORB 2 */}
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 120, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-[-160px] right-[-140px] h-[460px] w-[460px] rounded-full bg-cyan-500/20 blur-[140px]"
      />

      {/* ORB 3 */}
      <motion.div
        animate={{
          x: [0, 60, 0],
          y: [0, -80, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute left-[30%] top-[40%] h-[280px] w-[280px] rounded-full bg-fuchsia-500/10 blur-[100px]"
      />

      {/* GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_70px]" />

      {/* NOISE */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light">
        <div className="h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>
    </div>
  );
}