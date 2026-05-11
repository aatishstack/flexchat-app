"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const suggestions = [
  "Summarize this chat",
  "Generate quick reply",
  "Translate messages",
  "Find important media",
];

export default function AICopilot({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={onClose}
            className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm"
          />

          {/* PANEL */}
          <motion.div
            initial={{
              x: 400,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: 400,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              damping: 24,
            }}
            className="fixed right-0 top-0 z-[9998] flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[#050816]/95 shadow-[0_20px_120px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
          >
            {/* HEADER */}
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300">
                    FLEX AI
                  </p>

                  <h2 className="mt-1 text-4xl font-black">
                    Copilot
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* AI ORB */}
            <div className="flex flex-col items-center justify-center border-b border-white/10 px-6 py-10">
              <motion.div
                animate={{
                  scale: [1, 1.06, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-6xl shadow-[0_20px_120px_rgba(139,92,246,0.45)]"
              >
                ✨
              </motion.div>

              <h3 className="mt-6 text-2xl font-black">
                Neural Assistant Active
              </h3>

              <p className="mt-2 text-center text-sm text-white/50">
                AI-enhanced realtime productivity
              </p>
            </div>

            {/* SUGGESTIONS */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {suggestions.map(
                (item, index) => (
                  <motion.button
                    key={index}
                    whileHover={{
                      scale: 1.02,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left"
                  >
                    <p className="text-sm text-cyan-300">
                      AI ACTION
                    </p>

                    <h3 className="mt-1 font-black">
                      {item}
                    </h3>
                  </motion.button>
                )
              )}

              {/* LIVE RESPONSE */}
              <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm text-cyan-300">
                  LIVE ANALYSIS
                </p>

                <h3 className="mt-2 font-black">
                  Conversation energy detected
                </h3>

                <p className="mt-2 text-sm text-white/60">
                  High realtime interaction probability.
                </p>
              </div>
            </div>

            {/* INPUT */}
            <div className="border-t border-white/10 p-5">
              <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <input
                  placeholder="Ask Flex AI..."
                  className="flex-1 bg-transparent outline-none placeholder:text-white/35"
                />

                <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500">
                  ✨
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}