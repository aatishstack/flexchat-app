"use client";

import { motion } from "framer-motion";

const particles = Array.from({ length: 30 });

export default function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((_, index) => {
        const size = Math.random() * 6 + 2;

        return (
          <motion.div
            key={index}
            initial={{
              opacity: 0,
              y: Math.random() * 1200,
              x: Math.random() * 1800,
            }}
            animate={{
              opacity: [0, 0.7, 0],
              y: [
                Math.random() * 1000,
                Math.random() * -200,
              ],
              x: [
                Math.random() * 1600,
                Math.random() * 1400,
              ],
            }}
            transition={{
              duration: Math.random() * 15 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5,
            }}
            style={{
              width: size,
              height: size,
            }}
            className="absolute rounded-full bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.8)]"
          />
        );
      })}
    </div>
  );
}