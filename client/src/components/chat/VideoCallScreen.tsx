"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function VideoCallScreen({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
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
          className="fixed inset-0 z-[9999] overflow-hidden bg-black"
        >
          {/* BACKGROUND */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#12061f] via-[#050816] to-[#041520]" />

          {/* REMOTE VIDEO */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
              }}
              className="flex h-full w-full items-center justify-center"
            >
              <div className="flex h-[280px] w-[280px] items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-8xl font-black shadow-[0_20px_120px_rgba(139,92,246,0.5)]">
                M
              </div>
            </motion.div>
          </div>

          {/* OVERLAY */}
          <div className="absolute inset-0 bg-black/20" />

          {/* TOP */}
          <div className="absolute left-0 top-0 z-10 flex w-full items-center justify-between p-6">
            <div>
              <h1 className="text-4xl font-black text-white">
                Mayuri
              </h1>

              <p className="mt-2 text-cyan-300">
                Video Call • HD
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur-xl">
              04:28
            </div>
          </div>

          {/* SELF VIEW */}
          <motion.div
            drag
            dragMomentum={false}
            whileHover={{
              scale: 1.03,
            }}
            className="absolute right-6 top-28 z-20 overflow-hidden rounded-[32px] border border-white/10 bg-black/40 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-3xl"
          >
            <div className="flex h-[220px] w-[160px] items-center justify-center bg-gradient-to-br from-cyan-500/40 to-purple-500/40 text-5xl font-black">
              Y
            </div>
          </motion.div>

          {/* CONTROLS */}
          <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5 rounded-full border border-white/10 bg-black/30 px-6 py-4 backdrop-blur-3xl">
            {[
              {
                icon: "🎤",
                bg: "bg-white/[0.08]",
              },
              {
                icon: "📹",
                bg: "bg-white/[0.08]",
              },
              {
                icon: "🖥️",
                bg: "bg-white/[0.08]",
              },
              {
                icon: "💬",
                bg: "bg-white/[0.08]",
              },
              {
                icon: "📞",
                bg: "bg-red-500",
              },
            ].map((item, index) => (
              <motion.button
                key={index}
                whileHover={{
                  scale: 1.08,
                }}
                whileTap={{
                  scale: 0.9,
                }}
                onClick={() => {
                  if (item.icon === "📞") {
                    onClose();
                  }
                }}
                className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl ${item.bg}`}
              >
                {item.icon}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}