"use client";

import { motion } from "framer-motion";

export default function HUDStats() {
  const stats = [
    {
      label: "ONLINE",
      value: "12.4K",
    },
    {
      label: "LATENCY",
      value: "24MS",
    },
    {
      label: "AI LOAD",
      value: "98%",
    },
  ];

  return (
    <div className="pointer-events-none fixed left-6 top-1/2 z-[9998] hidden -translate-y-1/2 xl:flex flex-col gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{
            opacity: 0,
            x: -40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            delay: index * 0.12,
          }}
          className="overflow-hidden rounded-[28px] border border-white/10 bg-black/30 px-5 py-4 backdrop-blur-3xl"
        >
          {/* GLOW */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10" />

          <div className="relative z-10">
            <p className="text-xs tracking-[0.3em] text-white/40">
              {stat.label}
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {stat.value}
            </h2>
          </div>
        </motion.div>
      ))}
    </div>
  );
}