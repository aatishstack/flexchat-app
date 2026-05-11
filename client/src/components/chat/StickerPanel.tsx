"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const stickers = [
  "🔥",
  "😭",
  "😈",
  "💀",
  "✨",
  "⚡",
  "🫡",
  "🥶",
  "🚀",
  "💜",
  "👀",
  "🤝",
];

export default function StickerPanel({
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
              y: 100,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: 100,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              damping: 24,
            }}
            className="fixed bottom-0 left-0 z-[9998] w-full rounded-t-[40px] border-t border-white/10 bg-[#050816]/95 backdrop-blur-3xl"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-sm text-cyan-300">
                  EXPRESSIONS
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  Stickers & GIFs
                </h2>
              </div>

              <button
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                ✕
              </button>
            </div>

            {/* TABS */}
            <div className="flex gap-3 px-6 py-4">
              {["Stickers", "GIFs", "Emoji"].map(
                (item, index) => (
                  <button
                    key={index}
                    className={`rounded-2xl px-5 py-3 text-sm font-black ${
                      index === 0
                        ? "bg-gradient-to-r from-purple-600 to-cyan-500"
                        : "border border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            {/* GRID */}
            <div className="grid grid-cols-4 gap-4 p-6 md:grid-cols-6 xl:grid-cols-8">
              {stickers.map(
                (sticker, index) => (
                  <motion.button
                    key={index}
                    whileHover={{
                      scale: 1.08,
                    }}
                    whileTap={{
                      scale: 0.92,
                    }}
                    className="flex aspect-square items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.04] text-5xl"
                  >
                    {sticker}
                  </motion.button>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}