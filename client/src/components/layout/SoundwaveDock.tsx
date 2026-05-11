"use client";

import { motion } from "framer-motion";

export default function SoundwaveDock() {
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[9998] hidden -translate-x-1/2 xl:block">
      <div className="flex items-end gap-[6px] rounded-full border border-white/10 bg-black/30 px-6 py-4 backdrop-blur-3xl">
        {[18, 28, 14, 34, 22, 38, 18, 30, 12, 24, 16].map(
          (height, index) => (
            <motion.div
              key={index}
              animate={{
                height: [
                  height,
                  height + 18,
                  height,
                ],
              }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: index * 0.06,
              }}
              className="w-[5px] rounded-full bg-gradient-to-t from-purple-500 via-cyan-400 to-white"
              style={{
                height,
              }}
            />
          )
        )}
      </div>
    </div>
  );
}