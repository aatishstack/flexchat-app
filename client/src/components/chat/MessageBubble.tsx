"use client";

import {
  Check,
  CheckCheck,
} from "lucide-react";

import { motion } from "framer-motion";

type MessageBubbleProps = {
  sender: "me" | "them";
  text: string;
  time: string;
  status?: "sending" | "sent" | "seen";
};

export default function MessageBubble({
  sender,
  text,
  time,
  status,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className={`flex ${
        sender === "me"
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-[32px] px-5 py-4 ${
          sender === "me"
            ? "rounded-br-md bg-gradient-to-r from-violet-600 to-fuchsia-600"
            : "rounded-bl-md border border-white/10 bg-white/[0.05]"
        }`}
      >
        <p className="text-[15px] leading-relaxed">
          {text}
        </p>

        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-[11px] text-white/60">
            {time}
          </span>

          {sender === "me" && (
            <>
              {status === "sending" && (
                <motion.div
                  animate={{
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                  className="h-2 w-2 rounded-full bg-white"
                />
              )}

              {status === "sent" && (
                <Check
                  size={14}
                  className="text-white/80"
                />
              )}

              {status === "seen" && (
                <CheckCheck
                  size={14}
                  className="text-cyan-300"
                />
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}