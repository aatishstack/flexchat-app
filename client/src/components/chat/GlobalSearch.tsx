"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const results = [
  {
    user: "Mayuri",
    text: "Realtime backend connects 😈",
    time: "2m ago",
  },
  {
    user: "Flex AI",
    text: "Generated conversation summary",
    time: "10m ago",
  },
  {
    user: "Realtime Team",
    text: "Socket sync completed",
    time: "22m ago",
  },
];

export default function GlobalSearch({
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

          {/* MODAL */}
          <motion.div
            initial={{
              opacity: 0,
              y: 40,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 40,
              scale: 0.96,
            }}
            transition={{
              type: "spring",
              damping: 22,
            }}
            className="fixed left-1/2 top-1/2 z-[9998] w-[92%] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[40px] border border-white/10 bg-[#050816]/90 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl"
          >
            {/* GLOW */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />

            <div className="relative z-10 p-6">
              {/* HEADER */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <input
                    autoFocus
                    placeholder="Search messages, media, files..."
                    className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-5 text-lg outline-none placeholder:text-white/35"
                  />
                </div>

                <button
                  onClick={onClose}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  ✕
                </button>
              </div>

              {/* RESULTS */}
              <div className="mt-8 space-y-4">
                {results.map((item, index) => (
                  <motion.button
                    key={index}
                    whileHover={{
                      scale: 1.01,
                    }}
                    className="flex w-full items-start gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left"
                  >
                    {/* AVATAR */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 font-black">
                      {item.user.charAt(0)}
                    </div>

                    {/* INFO */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-black">
                          {item.user}
                        </h3>

                        <p className="text-xs text-white/40">
                          {item.time}
                        </p>
                      </div>

                      <p className="mt-2 text-sm text-white/65">
                        {item.text}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* FOOTER */}
              <div className="mt-8 rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 px-5 py-4">
                <p className="text-sm text-cyan-300">
                  FLEX SEARCH ENGINE
                </p>

                <h3 className="mt-1 font-black">
                  Neural indexing systems active
                </h3>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}