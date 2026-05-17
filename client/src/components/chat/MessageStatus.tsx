"use client";

import {
  AlertCircle,
  Check,
  CheckCheck,
} from "lucide-react";

import {
  motion,
  useReducedMotion,
} from "framer-motion";

type Props = {
  status:
    | "sending"
    | "sent"
    | "delivered"
    | "read"
    | "failed";
};

export default function MessageStatus({
  status,
}: Props) {
  const reducedMotion = useReducedMotion();

  if (status === "sending") {
    if (reducedMotion) {
      return (
        <div className="h-3.5 w-3.5 rounded-full border border-white/30 border-t-cyan-300" />
      );
    }

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
        className="h-3.5 w-3.5 rounded-full border border-white/30 border-t-cyan-300"
      />
    );
  }

  if (status === "sent") {
    return (
      <Check
        size={14}
        className="text-white/55"
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        size={14}
        className="text-white/70"
      />
    );
  }

  if (status === "failed") {
    return (
      <AlertCircle
        size={14}
        className="text-red-200"
      />
    );
  }

  return (
    <CheckCheck
      size={14}
      className="text-cyan-300"
    />
  );
}
