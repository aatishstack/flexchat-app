"use client";

import {
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";

import type {
  ReactNode,
  MouseEvent,
  CSSProperties,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
};

export default function MagneticButton({
  children,
  className = "",
  onClick,
  style,
}: Props) {
  const x = useMotionValue(0);

  const y = useMotionValue(0);

  const springX = useSpring(x, {
    stiffness: 180,
    damping: 14,
  });

  const springY = useSpring(y, {
    stiffness: 180,
    damping: 14,
  });

  const handleMouseMove = (
    e: MouseEvent<HTMLButtonElement>
  ) => {
    const rect =
      e.currentTarget.getBoundingClientRect();

    const centerX =
      rect.left + rect.width / 2;

    const centerY =
      rect.top + rect.height / 2;

    x.set(
      (e.clientX - centerX) * 0.25
    );

    y.set(
      (e.clientY - centerY) * 0.25
    );
  };

  const reset = () => {
    x.set(0);

    y.set(0);
  };

  return (
    <motion.button
      onClick={onClick}
      style={{
        ...style,
        x: springX,
        y: springY,
      }}
      whileTap={{
        scale: 0.92,
      }}
      whileHover={{
        scale: 1.04,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      className={className}
    >
      {children}
    </motion.button>
  );
}