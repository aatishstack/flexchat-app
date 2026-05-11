"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const notifications = [
  {
    title: "Mayuri reacted ❤️",
    time: "2m ago",
  },
  {
    title: "Realtime Team started call",
    time: "5m ago",
  },
  {
    title: "Flex AI generated summary",
    time: "8m ago",
  },
  {
    title: "New media received",
    time: "12m ago",
  },
];

export default function NotificationCenter({
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
            className="fixed right-0 top-0 z-[9998] h-full w-[380px] overflow-hidden border-l border-white/10 bg-black/40 shadow-[-20px_0_120px_rgba(0,0,0,0.45)] backdrop-blur-3xl"
          >
            {/* GLOW */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-cyan-500/10" />

            <div className="relative z-10 flex h-full flex-col">
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <div>
                  <p className="text-sm text-cyan-300">
                    FLEX OS
                  </p>

                  <h2 className="text-3xl font-black">
                    Notifications
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  ✕
                </button>
              </div>

              {/* LIST */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {notifications.map(
                  (item, index) => (
                    <motion.div
                      key={index}
                      initial={{
                        opacity: 0,
                        x: 40,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay: index * 0.08,
                      }}
                      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-black">
                            {item.title}
                          </h3>

                          <p className="mt-2 text-sm text-white/45">
                            {item.time}
                          </p>
                        </div>

                        <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}