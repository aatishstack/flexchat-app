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
    if (reducedMotion) {
      return (
        <div 
          className={cn("rounded-full border border-[#6C7883]/45 border-t-[#2AABEE]", className)}
          style={{ width: iconSize, height: iconSize }}
        />
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
        className={cn("rounded-full border border-[#6C7883]/45 border-t-[#2AABEE]", className)}
        style={{ width: iconSize, height: iconSize }}
      />
    );
  }

  if (status === "sent") {
    return (
      <Check
        size={iconSize}
        className={cn("text-[#6C7883]", className)}
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        size={iconSize}
        className={cn("text-[#6C7883]", className)}
      />
    );
  }

  if (status === "failed") {
    return (
      <AlertCircle
        size={iconSize}
        className={cn("text-red-200", className)}
      />
    );
  }

  return (
    <CheckCheck
      size={iconSize}
      className={cn("text-[#2AABEE]", className)}
    />
  );
}
