"use client";

import { motion } from "framer-motion";

type Props = {
  status:
    | "sending"
    | "sent"
    | "delivered"
    | "read";
};

export default function MessageStatus({
  status,
}: Props) {
  if (status === "sending") {
    return (
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
        }}
        className="h-4 w-4 rounded-full border border-white/30 border-t-cyan-300"
      />
    );
  }

  if (status === "sent") {
    return (
      <span className="text-xs text-white/40">
        ✓
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="text-xs text-white/60">
        ✓✓
      </span>
    );
  }

  return (
    <motion.span
      initial={{
        opacity: 0.6,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        repeatType: "reverse",
      }}
      className="text-xs text-cyan-300"
    >
      ✓✓
    </motion.span>
  );
}