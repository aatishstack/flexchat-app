"use client";

import { motion } from "framer-motion";

interface Props {
  mine: boolean;
  text: string;
  createdAt: string;
}

export default function MessageBubble({
  mine,
  text,
  createdAt,
}: Props) {
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
        mine
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`max-w-md rounded-[38px] px-6 py-4 text-sm leading-relaxed message-glow ${
          mine
            ? "bg-gradient-to-r from-violet-500 to-purple-600"
            : "glass text-zinc-200"
        }`}
      >
        <div>{text}</div>

        <div
          className={`mt-2 text-[11px] opacity-70 ${
            mine
              ? "text-right"
              : "text-left"
          }`}
        >
          {createdAt}
        </div>
      </div>
    </motion.div>
  );
}