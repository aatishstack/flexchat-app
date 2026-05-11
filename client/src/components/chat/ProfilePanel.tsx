"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ProfilePanel({
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
              x: 420,
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: 420,
            }}
            transition={{
              type: "spring",
              damping: 22,
            }}
            className="fixed right-0 top-0 z-[9998] h-full w-[390px] overflow-hidden border-l border-white/10 bg-black/40 shadow-[-20px_0_120px_rgba(0,0,0,0.45)] backdrop-blur-3xl"
          >
            {/* GLOW */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-cyan-500/10" />

            <div className="relative z-10 flex h-full flex-col">
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <p className="text-sm text-cyan-300">
                    USER PROFILE
                  </p>

                  <h2 className="text-3xl font-black">
                    Mayuri
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  ✕
                </button>
              </div>

              {/* PROFILE */}
              <div className="flex flex-col items-center px-6 py-10">
                <motion.div
                  animate={{
                    scale: [1, 1.03, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                  className="relative"
                >
                  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-5xl font-black shadow-[0_20px_80px_rgba(139,92,246,0.45)]">
                    M
                  </div>

                  <div className="absolute bottom-3 right-3 h-6 w-6 rounded-full border-4 border-[#050816] bg-green-400 shadow-[0_0_30px_rgba(74,222,128,0.9)]" />
                </motion.div>

                <h2 className="mt-6 text-4xl font-black">
                  Mayuri
                </h2>

                <p className="mt-2 text-cyan-300">
                  Online now
                </p>

                <p className="mt-4 text-center text-sm leading-relaxed text-white/45">
                  Building futuristic realtime experiences with FlexChat 😈🔥
                </p>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-3 px-6">
                {[
                  {
                    label: "Media",
                    value: "248",
                  },
                  {
                    label: "Links",
                    value: "32",
                  },
                  {
                    label: "Files",
                    value: "91",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-center"
                  >
                    <h3 className="text-2xl font-black">
                      {item.value}
                    </h3>

                    <p className="mt-1 text-sm text-white/45">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* ACTIONS */}
              <div className="mt-8 space-y-3 px-6">
                {[
                  "View Shared Media",
                  "Search Messages",
                  "Mute Notifications",
                  "Start Secret Chat",
                ].map((item, index) => (
                  <motion.button
                    key={index}
                    whileHover={{
                      scale: 1.02,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    className="flex w-full items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-left"
                  >
                    <span className="font-medium">
                      {item}
                    </span>

                    <span className="text-white/35">
                      →
                    </span>
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