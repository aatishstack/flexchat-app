"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const media = [
  "/demo/1.jpg",
  "/demo/2.jpg",
  "/demo/3.jpg",
  "/demo/4.jpg",
  "/demo/5.jpg",
  "/demo/6.jpg",
];

export default function MediaGallery({
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
            className="fixed inset-0 z-[9997] bg-black/60 backdrop-blur-md"
          />

          {/* PANEL */}
          <motion.div
            initial={{
              y: 80,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: 80,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              damping: 24,
            }}
            className="fixed inset-x-0 bottom-0 z-[9998] h-[82vh] overflow-hidden rounded-t-[40px] border-t border-white/10 bg-[#050816]/95 backdrop-blur-3xl"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-sm text-cyan-300">
                  SHARED MEDIA
                </p>

                <h2 className="mt-1 text-3xl font-black">
                  Gallery
                </h2>
              </div>

              <button
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                ✕
              </button>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-2 gap-4 overflow-y-auto p-6 md:grid-cols-3 xl:grid-cols-4">
              {media.map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={{
                    scale: 1.03,
                  }}
                  className="group relative aspect-square overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-purple-600/30 to-cyan-500/30"
                >
                  {/* FAKE IMAGE */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_50%)]" />

                  {/* ICON */}
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-80 transition-all duration-300 group-hover:scale-110">
                    🖼️
                  </div>

                  {/* OVERLAY */}
                  <div className="absolute inset-0 bg-black/10 opacity-0 transition-all duration-300 group-hover:opacity-100" />

                  {/* META */}
                  <div className="absolute bottom-4 left-4">
                    <p className="text-sm font-black">
                      Flex Media
                    </p>

                    <p className="text-xs text-white/60">
                      HD Preview
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}