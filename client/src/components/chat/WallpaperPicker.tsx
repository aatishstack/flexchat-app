"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (wallpaper: string) => void;
};

const wallpapers = [
  {
    id: "purple",
    className:
      "from-purple-600 via-fuchsia-500 to-cyan-500",
  },
  {
    id: "ocean",
    className:
      "from-cyan-500 via-blue-500 to-indigo-600",
  },
  {
    id: "sunset",
    className:
      "from-orange-500 via-pink-500 to-purple-600",
  },
  {
    id: "matrix",
    className:
      "from-green-500 via-emerald-500 to-black",
  },
  {
    id: "midnight",
    className:
      "from-[#050816] via-slate-900 to-black",
  },
];

export default function WallpaperPicker({
  open,
  onClose,
  onSelect,
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
            className="fixed inset-0 z-[9997] bg-black/50 backdrop-blur-sm"
          />

          {/* PANEL */}
          <motion.div
            initial={{
              y: 60,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: 60,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              damping: 24,
            }}
            className="fixed bottom-0 left-0 z-[9998] w-full rounded-t-[40px] border-t border-white/10 bg-[#050816]/95 p-6 shadow-[0_-20px_120px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
          >
            {/* HEADER */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-300">
                  CHAT WALLPAPER
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  Customize Mood
                </h2>
              </div>

              <button
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                ✕
              </button>
            </div>

            {/* WALLPAPERS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {wallpapers.map(
                (wallpaper, index) => (
                  <motion.button
                    key={index}
                    whileHover={{
                      scale: 1.04,
                    }}
                    whileTap={{
                      scale: 0.96,
                    }}
                    onClick={() => {
                      onSelect(
                        wallpaper.id
                      );

                      onClose();
                    }}
                    className={`relative h-40 overflow-hidden rounded-[28px] bg-gradient-to-br ${wallpaper.className}`}
                  >
                    <div className="absolute inset-0 bg-black/20" />

                    <div className="absolute bottom-4 left-4">
                      <p className="font-black capitalize">
                        {wallpaper.id}
                      </p>
                    </div>
                  </motion.button>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}