"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ReplyPreview({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 20,
          }}
          className="mb-3 overflow-hidden rounded-[24px] border border-cyan-400/20 bg-cyan-400/10"
        >
          <div className="flex items-start justify-between gap-4 p-4">
            <div className="flex gap-3">
              {/* BAR */}
              <div className="w-[4px] rounded-full bg-cyan-400" />

              <div>
                <p className="text-sm text-cyan-300">
                  Replying to Mayuri
                </p>

                <p className="mt-1 text-sm text-white/70">
                  Bro this wallpaper system is insane 😭🔥
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white/40 transition hover:text-white"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}