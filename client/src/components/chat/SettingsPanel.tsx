"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const settings = [
  {
    title: "Realtime Sync",
    status: true,
  },
  {
    title: "Read Receipts",
    status: true,
  },
  {
    title: "Typing Indicators",
    status: true,
  },
  {
    title: "AI Suggestions",
    status: false,
  },
];

export default function SettingsPanel({
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
            className="fixed inset-0 z-[9996] bg-black/40 backdrop-blur-sm"
          />

          {/* PANEL */}
          <motion.div
            initial={{
              y: 50,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: 50,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              damping: 20,
            }}
            className="fixed bottom-6 right-6 z-[9997] w-[420px] overflow-hidden rounded-[36px] border border-white/10 bg-black/40 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl"
          >
            {/* GLOW */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />

            <div className="relative z-10 p-6">
              {/* HEADER */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300">
                    FLEX OS
                  </p>

                  <h2 className="text-3xl font-black">
                    Settings
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  ✕
                </button>
              </div>

              {/* SETTINGS */}
              <div className="mt-8 space-y-4">
                {settings.map(
                  (item, index) => (
                    <motion.div
                      key={index}
                      whileHover={{
                        scale: 1.01,
                      }}
                      className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4"
                    >
                      <div>
                        <h3 className="font-black">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-sm text-white/45">
                          System preference
                        </p>
                      </div>

                      <div
                        className={`flex h-8 w-14 items-center rounded-full px-1 transition-all ${
                          item.status
                            ? "bg-cyan-400"
                            : "bg-white/10"
                        }`}
                      >
                        <motion.div
                          layout
                          className="h-6 w-6 rounded-full bg-white"
                          style={{
                            marginLeft:
                              item.status
                                ? "auto"
                                : 0,
                          }}
                        />
                      </div>
                    </motion.div>
                  )
                )}
              </div>

              {/* THEMES */}
              <div className="mt-8">
                <p className="mb-4 text-sm text-cyan-300">
                  ACTIVE THEMES
                </p>

                <div className="flex gap-3">
                  {[
                    "from-purple-600 to-cyan-500",
                    "from-pink-500 to-orange-400",
                    "from-green-500 to-emerald-300",
                  ].map((theme, index) => (
                    <button
                      key={index}
                      className={`h-14 flex-1 rounded-2xl bg-gradient-to-r ${theme}`}
                    />
                  ))}
                </div>
              </div>

              {/* FOOTER */}
              <div className="mt-8 rounded-[24px] border border-purple-400/20 bg-purple-400/10 px-5 py-4">
                <p className="text-sm text-purple-300">
                  FLEXCHAT PREMIUM
                </p>

                <h3 className="mt-1 font-black">
                  Ultra realtime systems active
                </h3>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}