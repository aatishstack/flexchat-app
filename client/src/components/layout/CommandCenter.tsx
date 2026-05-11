"use client";

import { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import MagneticButton from "@/components/ui/MagneticButton";

export default function CommandCenter() {
  const [open, setOpen] =
    useState(false);

  return (
    <>
      {/* BUTTON */}
      <div className="fixed bottom-44 right-6 z-[9998] hidden xl:block">
        <MagneticButton
          onClick={() =>
            setOpen(!open)
          }
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-2xl shadow-[0_20px_80px_rgba(139,92,246,0.45)]"
        >
          ✨
        </MagneticButton>
      </div>

      {/* PANEL */}
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
              onClick={() =>
                setOpen(false)
              }
              className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm"
            />

            {/* COMMAND PANEL */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.8,
                y: 40,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                y: 40,
              }}
              transition={{
                type: "spring",
                damping: 20,
              }}
              className="fixed bottom-32 right-6 z-[9998] hidden w-[420px] overflow-hidden rounded-[36px] border border-white/10 bg-black/40 shadow-[0_20px_120px_rgba(0,0,0,0.6)] backdrop-blur-3xl xl:block"
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

                    <h2 className="mt-1 text-3xl font-black">
                      Command Center
                    </h2>
                  </div>

                  <button
                    onClick={() =>
                      setOpen(false)
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                  >
                    ✕
                  </button>
                </div>

                {/* SEARCH */}
                <div className="mt-6">
                  <input
                    placeholder="Search command..."
                    className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none placeholder:text-white/35"
                  />
                </div>

                {/* GRID */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[
                    "Realtime",
                    "Voice",
                    "AI Reply",
                    "Themes",
                    "Calls",
                    "Security",
                  ].map((item, index) => (
                    <motion.button
                      whileHover={{
                        scale: 1.03,
                      }}
                      whileTap={{
                        scale: 0.96,
                      }}
                      key={index}
                      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:border-cyan-400/30 hover:bg-cyan-400/10"
                    >
                      <p className="text-sm text-white/45">
                        Module
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {item}
                      </h3>
                    </motion.button>
                  ))}
                </div>

                {/* STATUS */}
                <div className="mt-6 flex items-center justify-between rounded-[28px] border border-green-400/20 bg-green-400/10 px-5 py-4">
                  <div>
                    <p className="text-sm text-green-300">
                      SYSTEM STATUS
                    </p>

                    <h3 className="mt-1 font-black">
                      All systems operational
                    </h3>
                  </div>

                  <div className="h-4 w-4 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.9)]" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}