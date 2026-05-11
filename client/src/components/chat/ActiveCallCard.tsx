"use client";

import { motion } from "framer-motion";

export default function ActiveCallCard() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 30,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="fixed right-6 top-24 z-[9997] hidden w-[340px] overflow-hidden rounded-[32px] border border-white/10 bg-black/40 shadow-[0_20px_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl xl:block"
    >
      {/* GLOW */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-cyan-500/10" />

      <div className="relative z-10 p-5">
        {/* TOP */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-2xl font-black">
              M
            </div>

            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#050816] bg-green-400" />
          </div>

          <div>
            <h2 className="text-2xl font-black">
              Mayuri
            </h2>

            <p className="text-sm text-green-300">
              Connected • 04:28
            </p>
          </div>
        </div>

        {/* WAVE */}
        <div className="mt-6 flex items-end justify-center gap-[5px]">
          {[20, 36, 24, 42, 28, 34, 18].map(
            (height, index) => (
              <motion.div
                key={index}
                animate={{
                  height: [
                    height,
                    height + 14,
                    height,
                  ],
                }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: index * 0.08,
                }}
                className="w-[6px] rounded-full bg-gradient-to-t from-green-400 to-cyan-300"
                style={{
                  height,
                }}
              />
            )
          )}
        </div>

        {/* CONTROLS */}
        <div className="mt-8 flex items-center justify-center gap-4">
          {[
            {
              icon: "🎤",
              color:
                "bg-white/[0.06]",
            },
            {
              icon: "🎥",
              color:
                "bg-white/[0.06]",
            },
            {
              icon: "📞",
              color:
                "bg-red-500",
            },
          ].map((item, index) => (
            <motion.button
              key={index}
              whileTap={{
                scale: 0.9,
              }}
              whileHover={{
                scale: 1.08,
              }}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl ${item.color}`}
            >
              {item.icon}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}