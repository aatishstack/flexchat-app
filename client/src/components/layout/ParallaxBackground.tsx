"use client";

import { useEffect } from "react";

import {
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";

export default function ParallaxBackground() {
  const mouseX = useMotionValue(0);

  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, {
    stiffness: 40,
    damping: 20,
  });

  const springY = useSpring(mouseY, {
    stiffness: 40,
    damping: 20,
  });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const x =
        (e.clientX /
          window.innerWidth -
          0.5) *
        40;

      const y =
        (e.clientY /
          window.innerHeight -
          0.5) *
        40;

      mouseX.set(x);

      mouseY.set(y);
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
  }, [mouseX, mouseY]);

  return (
    <>
      {/* PURPLE */}
      <motion.div
        style={{
          x: springX,
          y: springY,
        }}
        className="pointer-events-none fixed left-[-10%] top-[-10%] z-0 h-[520px] w-[520px] rounded-full bg-purple-500/20 blur-[140px]"
      />

      {/* CYAN */}
      <motion.div
        style={{
          x: springX.get() * -1.2,
          y: springY.get() * -1.2,
        }}
        className="pointer-events-none fixed bottom-[-10%] right-[-10%] z-0 h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-[140px]"
      />

      {/* CENTER */}
      <motion.div
        style={{
          x: springX.get() * 0.5,
          y: springY.get() * 0.5,
        }}
        className="pointer-events-none fixed left-[35%] top-[30%] z-0 h-[260px] w-[260px] rounded-full bg-pink-500/10 blur-[120px]"
      />
    </>
  );
}