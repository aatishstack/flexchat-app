"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  loading: boolean;
};

export default function AppLoader({
  loading,
}: Props) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
            scale: 1.04,
          }}
          transition={{
            duration: 0.6,
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-[#050816]"
        >
          {/* GRID */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />

          {/* GLOW */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
            className="absolute h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-[120px]"
          />

          {/* CONTENT */}
          <div className="relative z-10 flex flex-col items-center">
            {/* LOGO */}
            <motion.div
              initial={{
                scale: 0.5,
                opacity: 0,
                rotate: -20,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: 0,
              }}
              transition={{
                duration: 0.8,
                type: "spring",
              }}
              className="relative flex h-32 w-32 items-center justify-center rounded-[38px] bg-gradient-to-r from-purple-600 to-cyan-500 text-5xl font-black shadow-[0_20px_80px_rgba(139,92,246,0.45)]"
            >
              {/* PULSE */}
              <div className="absolute inset-0 animate-ping rounded-[38px] bg-purple-500/20" />

              F
            </motion.div>

            {/* TITLE */}
            <motion.h1
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.3,
              }}
              className="mt-10 text-6xl font-black"
            >
              FlexChat
            </motion.h1>

            <motion.p
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.5,
              }}
              className="mt-4 text-lg text-white/45"
            >
              Next-generation communication
            </motion.p>

            {/* LOADER */}
            <div className="mt-12 flex items-center gap-3">
              {[0, 1, 2].map((item) => (
                <motion.div
                  key={item}
                  animate={{
                    y: [0, -12, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: item * 0.12,
                  }}
                  className="h-4 w-4 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}