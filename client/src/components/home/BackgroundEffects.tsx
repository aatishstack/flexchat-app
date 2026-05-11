"use client";

import { motion } from "framer-motion";

export default function BackgroundEffects() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* BASE */}
      <div className="absolute inset-0 bg-[#050816]" />

      {/* MESH 1 */}
      <motion.div
        animate={{
          x: [0, 200, -100, 0],
          y: [0, -100, 80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-[-10%] top-[-10%] h-[700px] w-[700px] rounded-full bg-purple-600/30 blur-3xl"
      />

      {/* MESH 2 */}
      <motion.div
        animate={{
          x: [0, -150, 100, 0],
          y: [0, 100, -80, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-20%] right-[-10%] h-[700px] w-[700px] rounded-full bg-blue-600/20 blur-3xl"
      />

      {/* MESH 3 */}
      <motion.div
        animate={{
          x: [0, 120, -120, 0],
          y: [0, -60, 120, 0],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-[30%] top-[20%] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-3xl"
      />

      {/* RADIAL DEPTH */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050816_75%)]" />

      {/* GRID */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
        }}
      />

      {/* NOISE */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-soft-light">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
      </div>

      {/* TOP LIGHT */}
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 bg-purple-500/10 blur-3xl" />

      {/* BOTTOM LIGHT */}
      <div className="absolute bottom-[-20%] left-1/2 h-[500px] w-[900px] -translate-x-1/2 bg-blue-500/10 blur-3xl" />
    </div>
  );
}