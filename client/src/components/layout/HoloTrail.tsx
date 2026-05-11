"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";

type Trail = {
  id: number;
  x: number;
  y: number;
};

export default function HoloTrail() {
  const [trails, setTrails] = useState<
    Trail[]
  >([]);

  useEffect(() => {
    let id = 0;

    const move = (e: MouseEvent) => {
      const newTrail = {
        id: id++,
        x: e.clientX,
        y: e.clientY,
      };

      setTrails((prev) => [
        ...prev.slice(-12),
        newTrail,
      ]);
    };

    window.addEventListener(
      "mousemove",
      move
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        move
      );
    };
  }, []);

  return (
    <>
      {trails.map((trail) => (
        <motion.div
          key={trail.id}
          initial={{
            opacity: 0.8,
            scale: 1,
          }}
          animate={{
            opacity: 0,
            scale: 2.8,
          }}
          transition={{
            duration: 0.7,
          }}
          className="pointer-events-none fixed z-[9997] hidden h-5 w-5 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 blur-md xl:block"
          style={{
            left: trail.x - 10,
            top: trail.y - 10,
          }}
        />
      ))}
    </>
  );
}