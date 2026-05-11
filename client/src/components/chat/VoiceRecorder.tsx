"use client";

import { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

export default function VoiceRecorder() {
  const [recording, setRecording] =
    useState(false);

  return (
    <div className="relative">
      {/* RECORDER UI */}
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 10,
            }}
            className="absolute bottom-16 right-0 flex items-center gap-4 rounded-[28px] border border-red-400/20 bg-black/40 px-5 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-3xl"
          >
            {/* PULSE */}
            <motion.div
              animate={{
                scale: [1, 1.4, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
              className="h-4 w-4 rounded-full bg-red-500"
            />

            {/* WAVES */}
            <div className="flex items-end gap-[4px]">
              {[18, 30, 16, 34, 20, 28].map(
                (height, index) => (
                  <motion.div
                    key={index}
                    animate={{
                      height: [
                        height,
                        height + 12,
                        height,
                      ],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: index * 0.08,
                    }}
                    className="w-[4px] rounded-full bg-red-400"
                    style={{
                      height,
                    }}
                  />
                )
              )}
            </div>

            {/* TIMER */}
            <p className="font-mono text-lg text-red-300">
              00:12
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BUTTON */}
      <motion.button
        whileTap={{
          scale: 0.9,
        }}
        onClick={() =>
          setRecording(!recording)
        }
        className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
          recording
            ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.7)]"
            : "bg-white/[0.04]"
        }`}
      >
        🎤
      </motion.button>
    </div>
  );
}