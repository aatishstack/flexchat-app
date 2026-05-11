"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PinnedMessage({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            y: -30,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: -30,
            opacity: 0,
          }}
          className="mx-6 mt-4 overflow-hidden rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 shadow-[0_10px_40px_rgba(34,211,238,0.15)] backdrop-blur-3xl"
        >
          <div className="flex items-center justify-between px-5 py-4">
            {/* LEFT */}
            <div className="flex items-center gap-4">
              {/* ICON */}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600">
                📌
              </div>

              {/* INFO */}
              <div>
                <p className="text-sm text-cyan-300">
                  PINNED MESSAGE
                </p>

                <h3 className="mt-1 font-black">
                  FlexChat realtime architecture finalized 😈
                </h3>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-2">
              <button className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">
                Jump
              </button>

              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}