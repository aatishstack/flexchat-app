"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  count: number;
  onClose: () => void;
};

export default function SelectionToolbar({
  open,
  count,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            y: -100,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: -100,
            opacity: 0,
          }}
          className="absolute left-0 top-0 z-[999] flex w-full items-center justify-between border-b border-white/10 bg-[#050816]/95 px-6 py-4 backdrop-blur-3xl"
        >
          {/* LEFT */}
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
            >
              ✕
            </button>

            <div>
              <p className="text-sm text-cyan-300">
                MESSAGE SELECT
              </p>

              <h2 className="font-black">
                {count} selected
              </h2>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            {["⭐", "📌", "📤", "🗑️"].map(
              (icon, index) => (
                <button
                  key={index}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  {icon}
                </button>
              )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}