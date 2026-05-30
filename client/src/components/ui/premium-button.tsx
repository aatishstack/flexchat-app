"use client";

import * as React from "react";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export default function PremiumButton({
  className,
  children,
  loading,
  ...props
}: PremiumButtonProps) {
  return (
    <motion.div
      whileHover={{
        scale: 1.01,
      }}
      whileTap={{
        scale: 0.98,
      }}
      className="w-full"
    >
      <button
        {...props}
        className={cn(
          "fc-button-primary flex h-14 w-full items-center justify-center rounded-2xl font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70",
          className
        )}
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          children
        )}
      </button>
    </motion.div>
  );
}
