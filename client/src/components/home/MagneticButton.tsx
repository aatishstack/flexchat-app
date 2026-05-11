"use client";

import { motion } from "framer-motion";
import { ReactNode, useRef } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function MagneticButton({
  children,
  className = "",
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const button = ref.current;

    if (!button) return;

    const rect = button.getBoundingClientRect();

    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    button.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  };

  const handleMouseLeave = () => {
    const button = ref.current;

    if (!button) return;

    button.style.transform = `translate(0px, 0px)`;
  };

  return (
    <motion.button
      ref={ref}
      whileTap={{
        scale: 0.95,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden transition-transform duration-200 ${className}`}
    >
      {/* GLASS REFLECTION */}
      <motion.div
        animate={{
          x: ["-150%", "250%"],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-y-0 left-0 w-24 rotate-12 bg-white/10 blur-xl"
      />

      <span className="relative z-10">
        {children}
      </span>
    </motion.button>
  );
}