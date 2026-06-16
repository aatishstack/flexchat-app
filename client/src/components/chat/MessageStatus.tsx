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

import { cn } from "@/lib/utils";

type Props = {
  status:
    | "sending"
    | "sent"
    | "delivered"
    | "read"
    | "failed";
  size?: number;
  className?: string;
};

export default function MessageStatus({
  status,
  size = 14,
  className,
}: Props) {
  const reducedMotion = useReducedMotion();
  const iconSize = size;

  if (status === "sending") {
    return (
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        className={cn("rounded-full border border-white/10 border-t-[#7C4FF0]", className)}
        style={{ width: iconSize, height: iconSize }}
      />
    );
  }

  if (status === "sent") {
    return (
      <Check
        size={iconSize}
        className={cn("text-white/20", className)}
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        size={iconSize}
        className={cn("text-white/20", className)}
      />
    );
  }

  if (status === "failed") {
    return (
      <AlertCircle
        size={iconSize}
        className={cn("text-red-400", className)}
      />
    );
  }

  return (
    <CheckCheck
      size={iconSize}
      className={cn("text-[#7C4FF0]", className)}
    />
  );
}
