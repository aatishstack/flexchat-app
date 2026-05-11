"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const chats = [
  "Mayuri",
  "Realtime Team",
  "Flex AI",
  "Creators Hub",
  "Voice Calls",
];

export default function ChatSearchOverlay({
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
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
          />

          {/* MODAL */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
              y: 40,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: 40,
            }}
            transition={{
              type: "spring",
              damping: 20,
            }}
            className="fixed left-1/2 top-24 z-[9999] w-[92%] max-w-2xl -translate-x-1/2 overflow-hidden rounded-[36px] border border-white/10 bg-black/40 shadow-[0_20px_120px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
          >
            {/* GLOW */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />

            <div className="relative z-10 p-6">
              {/* INPUT */}
              <input
                autoFocus
                placeholder="Search chats, messages, AI..."
                className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-5 text-lg outline-none placeholder:text-white/35"
              />

              {/* RESULTS */}
              <div className="mt-6 space-y-3">
                {chats.map((chat, index) => (
                  <motion.button
                    key={index}
                    whileHover={{
                      scale: 1.01,
                    }}
                    className="flex w-full items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-cyan-400/30 hover:bg-cyan-400/10"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-xl font-black">
                      {chat.charAt(0)}
                    </div>

                    <div>
                      <h2 className="font-black">
                        {chat}
                      </h2>

                      <p className="text-sm text-white/45">
                        Recent activity
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}