"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function VoiceCallScreen({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
            scale: 1.05,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 1.05,
          }}
          className="fixed inset-0 z-[9999] overflow-hidden bg-[#050816]"
        >
          {/* BACKGROUND */}
          <div className="absolute inset-0">
            <div className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-purple-600/20 blur-[120px]" />

            <div className="absolute bottom-[-140px] right-[-120px] h-[460px] w-[460px] rounded-full bg-cyan-500/20 blur-[140px]" />
          </div>

          {/* CONTENT */}
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
            {/* AVATAR */}
            <motion.div
              animate={{
                scale: [1, 1.04, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              className="flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-7xl font-black shadow-[0_20px_120px_rgba(139,92,246,0.5)]"
            >
              M
            </motion.div>

            {/* NAME */}
            <h1 className="mt-10 text-5xl font-black">
              Mayuri
            </h1>

            <p className="mt-3 text-lg text-cyan-300">
              Voice Call • 04:28
            </p>

            {/* WAVES */}
            <div className="mt-14 flex items-end gap-[6px]">
              {[40, 60, 36, 80, 42, 72, 48].map(
                (height, index) => (
                  <motion.div
                    key={index}
                    animate={{
                      height: [
                        height,
                        height + 30,
                        height,
                      ],
                    }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: index * 0.08,
                    }}
                    className="w-[8px] rounded-full bg-gradient-to-t from-cyan-400 to-purple-500"
                    style={{
                      height,
                    }}
                  />
                )
              )}
            </div>

            {/* CONTROLS */}
            <div className="mt-20 flex items-center gap-6">
              {[
                {
                  icon: "🎤",
                  bg: "bg-white/[0.08]",
                },
                {
                  icon: "🔊",
                  bg: "bg-white/[0.08]",
                },
                {
                  icon: "📞",
                  bg: "bg-red-500",
                },
              ].map((item, index) => (
                <motion.button
                  key={index}
                  whileHover={{
                    scale: 1.08,
                  }}
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={() => {
                    if (item.icon === "📞") {
                      onClose();
                    }
                  }}
                  className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl shadow-[0_10px_60px_rgba(0,0,0,0.35)] ${item.bg}`}
                >
                  {item.icon}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}