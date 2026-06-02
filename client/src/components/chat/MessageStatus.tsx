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
        <div className="h-3.5 w-3.5 rounded-full border border-[#6C7883]/45 border-t-[#2AABEE]" />
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
        className="h-3.5 w-3.5 rounded-full border border-[#6C7883]/45 border-t-[#2AABEE]"
      />
    );
  }

  if (status === "sent") {
    return (
      <Check
        size={14}
        className="text-[#6C7883]"
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        size={14}
        className="text-[#6C7883]"
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
      className="text-[#2AABEE]"
    />
  );
}
