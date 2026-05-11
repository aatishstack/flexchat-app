"use client";

import { motion } from "framer-motion";

const particles = Array.from(
  { length: 28 },
  (_, index) => ({
    id: index,
    left:
      ((index * 67) % 100) + "%",
    top:
      ((index * 43) % 100) + "%",
    duration: 12 + (index % 6),
    delay: index * 0.15,
  })
);

export default function ParticleStorm() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            opacity: 0,
            y: 0,
          }}
          animate={{
            opacity: [0, 0.8, 0],
            y: [-40, -180],
            x: [0, 40],
          }}
          transition={{
            duration:
              particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear",
          }}
          className="absolute h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.8)]"
          style={{
            left: particle.left,
            top: particle.top,
            filter: "blur(1px)",
          }}
        />
      ))}
    </div>
  );
}