"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  trigger: boolean;
};

const emojis = [
  "🔥",
  "😭",
  "😈",
  "✨",
  "⚡",
  "💜",
];

export default function ReactionBurst({
  trigger,
}: Props) {
  return (
    <AnimatePresence>
      {trigger && (
        <div className="pointer-events-none absolute inset-0 z-[999]">
          {emojis.map((emoji, index) => (
            <motion.div
              key={index}
              initial={{
                opacity: 0,
                scale: 0,
                x: 0,
                y: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.3, 1],
                x:
                  Math.random() * 220 - 110,
                y:
                  -Math.random() * 220,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 1.2,
                delay: index * 0.04,
              }}
              className="absolute left-1/2 top-1/2 text-3xl"
            >
              {emoji}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}