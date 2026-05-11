"use client";

import { motion } from "framer-motion";
import {
  ReactNode,
  useRef,
} from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function TiltCard({
  children,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const card = ref.current;

    if (!card) return;

    const rect = card.getBoundingClientRect();

    const x =
      (e.clientX - rect.left) / rect.width;

    const y =
      (e.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 18;
    const rotateX = (0.5 - y) * 18;

    card.style.transform = `
      perspective(1200px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale3d(1.02,1.02,1.02)
    `;
  };

  const reset = () => {
    const card = ref.current;

    if (!card) return;

    card.style.transform = `
      perspective(1200px)
      rotateX(0deg)
      rotateY(0deg)
      scale3d(1,1,1)
    `;
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      className={`transform-gpu transition-transform duration-300 will-change-transform ${className}`}
    >
      {/* LIGHT REFLECTION */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />

      {children}
    </motion.div>
  );
}