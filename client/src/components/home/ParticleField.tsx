"use client";

import { motion } from "framer-motion";

const particles = Array.from(
  {
    length: 30,
  },
  (_, index) => ({
    id: index,
    size: 2 + (index % 6),
    initialX: (index * 61) % 1800,
    initialY: (index * 97) % 1200,
    targetX: (index * 73) % 1600,
    targetY: -40 - (index % 5) * 38,
    duration: 10 + (index % 9),
    delay: (index % 6) * 0.35,
  })
);

export default function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            opacity: 0,
            y: particle.initialY,
            x: particle.initialX,
          }}
          animate={{
            opacity: [0, 0.7, 0],
            y: [
              particle.initialY,
              particle.targetY,
            ],
            x: [
              particle.initialX,
              particle.targetX,
            ],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "linear",
            delay: particle.delay,
          }}
          style={{
            width: particle.size,
            height: particle.size,
          }}
          className="absolute rounded-full bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.8)]"
        />
      ))}
    </div>
  );
}
