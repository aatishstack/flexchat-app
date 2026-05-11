"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const suggestions = [
  "Summarize conversation",
  "Generate quick reply",
  "Find important messages",
  "Create meeting notes",
];

export default function AIAssistantPanel({
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
            className="fixed inset-0 z-[9996] bg-black/30 backdrop-blur-sm"
          />

          {/* PANEL */}
          <motion.div
            initial={{
              y: 40,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: 40,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              damping: 22,
            }}
            className="fixed bottom-6 left-1/2 z-[9997] w-[92%] max-w-2xl -translate-x-1/2 overflow-hidden rounded-[36px] border border-white/10 bg-black/40 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl"
          >
            {/* GLOW */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />

            <div className="relative z-10 p-6">
              {/* HEADER */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300">
                    FLEX AI
                  </p>

                  <h2 className="text-3xl font-black">
                    Smart Assistant
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  ✕
                </button>
              </div>

              {/* INPUT */}
              <div className="mt-6">
                <input
                  placeholder="Ask Flex AI anything..."
                  className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none placeholder:text-white/35"
                />
              </div>

              {/* SUGGESTIONS */}
              <div className="mt-6 grid gap-3">
                {suggestions.map(
                  (item, index) => (
                    <motion.button
                      key={index}
                      whileHover={{
                        scale: 1.01,
                      }}
                      whileTap={{
                        scale: 0.97,
                      }}
                      className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-left"
                    >
                      <span className="font-medium">
                        {item}
                      </span>

                      <span className="text-cyan-300">
                        ✨
                      </span>
                    </motion.button>
                  )
                )}
              </div>

              {/* FOOTER */}
              <div className="mt-6 flex items-center justify-between rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 px-5 py-4">
                <div>
                  <p className="text-sm text-cyan-300">
                    AI STATUS
                  </p>

                  <h3 className="font-black">
                    Neural systems online
                  </h3>
                </div>

                <div className="h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.9)]" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}