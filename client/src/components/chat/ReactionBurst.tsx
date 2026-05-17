"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

type Props = {
  trigger: boolean;
};

const burstPaths = [
  {
    emoji: "!",
    x: -110,
    y: -120,
  },
  {
    emoji: "+",
    x: -66,
    y: -168,
  },
  {
    emoji: "*",
    x: -22,
    y: -136,
  },
  {
    emoji: "!",
    x: 22,
    y: -188,
  },
  {
    emoji: "+",
    x: 66,
    y: -144,
  },
  {
    emoji: "*",
    x: 110,
    y: -176,
  },
];

export default function ReactionBurst({
  trigger,
}: Props) {
  return (
    <AnimatePresence>
      {trigger && (
        <div className="pointer-events-none absolute inset-0 z-[999]">
          {burstPaths.map((path, index) => (
            <motion.div
              key={`${path.emoji}-${index}`}
              initial={{
                opacity: 0,
                scale: 0,
                x: 0,
                y: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.3, 1],
                x: path.x,
                y: path.y,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 1.2,
                delay: index * 0.04,
              }}
              className="absolute left-1/2 top-1/2 text-3xl text-cyan-200"
            >
              {path.emoji}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
