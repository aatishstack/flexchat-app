"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";

export default function CursorAura() {
  const [position, setPosition] =
    useState({
      x: 0,
      y: 0,
    });

  useEffect(() => {
    const updateMouse = (
      e: MouseEvent
    ) => {
      setPosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener(
      "mousemove",
      updateMouse
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        updateMouse
      );
    };
  }, []);

  return (
    <>
      {/* BIG GLOW */}
      <motion.div
        animate={{
          x: position.x - 160,
          y: position.y - 160,
        }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 140,
          mass: 0.5,
        }}
        className="pointer-events-none fixed left-0 top-0 z-[9998] hidden h-[320px] w-[320px] rounded-full bg-purple-500/10 blur-[100px] xl:block"
      />

      {/* SMALL DOT */}
      <motion.div
        animate={{
          x: position.x - 10,
          y: position.y - 10,
        }}
        transition={{
          type: "spring",
          damping: 40,
          stiffness: 500,
        }}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-5 w-5 rounded-full border border-white/40 bg-gradient-to-r from-purple-400 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.8)] xl:block"
      />
    </>
  );
}