"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MediaPreviewModal({
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
            className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-xl"
          />

          {/* MODAL */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
            }}
            transition={{
              type: "spring",
              damping: 18,
            }}
            className="fixed left-1/2 top-1/2 z-[9999] w-[92%] max-w-4xl -translate-x-1/2 -translate-y-1/2"
          >
            {/* IMAGE */}
            <div className="overflow-hidden rounded-[40px] border border-white/10 bg-black/40 shadow-[0_20px_120px_rgba(0,0,0,0.65)] backdrop-blur-3xl">
              <div className="relative flex h-[600px] items-center justify-center bg-gradient-to-br from-purple-600/30 via-black to-cyan-500/30">
                {/* CLOSE */}
                <button
                  onClick={onClose}
                  className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-xl backdrop-blur-xl"
                >
                  ✕
                </button>

                {/* FAKE MEDIA */}
                <motion.div
                  animate={{
                    scale: [1, 1.03, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                  }}
                  className="flex h-[320px] w-[320px] items-center justify-center rounded-[40px] border border-white/10 bg-gradient-to-br from-purple-600 to-cyan-500 text-8xl shadow-[0_20px_100px_rgba(139,92,246,0.45)]"
                >
                  🖼️
                </motion.div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between border-t border-white/10 px-6 py-5">
                <div>
                  <h2 className="text-xl font-black">
                    Flex Media
                  </h2>

                  <p className="text-sm text-white/45">
                    Sent by Mayuri • 2:52 PM
                  </p>
                </div>

                <div className="flex gap-3">
                  {["⬇️", "🔗", "❤️"].map(
                    (item, index) => (
                      <button
                        key={index}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}