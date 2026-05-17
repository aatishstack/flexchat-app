"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Mic,
  Volume2,
  X,
} from "lucide-react";


import { useLiveRoomStore } from "../../../store/live-room-store";



export default function VoiceRoomOrb() {
  const {
    active,
    expanded,
    roomName,
    listeners,
    leaveRoom,
    toggleExpanded,
  } =
    useLiveRoomStore();

  if (!active) {
    return null;
  }

  return (
    <div className="relative">
      {/* ORB */}
      <motion.button
        whileHover={{
          scale: 1.06,
        }}
        whileTap={{
          scale: 0.95,
        }}
        onClick={
          toggleExpanded
        }
        className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-2xl shadow-cyan-500/20 backdrop-blur-2xl sm:h-14 sm:w-14"
      >
        {/* ACTIVE RING */}
        <motion.div
          animate={{
            scale: [
              1,
              1.15,
              1,
            ],
            opacity: [
              0.7,
              1,
              0.7,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="absolute inset-0 rounded-full border border-cyan-400/40"
        />

        {/* ICON */}
        <Mic
          size={22}
          className="relative z-10 text-cyan-300"
        />

        {/* LIVE DOT */}
        <div className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-green-400 shadow-lg shadow-green-400/60" />
      </motion.button>

      {/* EXPANDED */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
              y: 12,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.7,
              y: 12,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
            className="absolute bottom-[calc(100%+0.75rem)] right-0 z-[160]"
          >
            <div className="w-[min(calc(100vw-1.5rem),320px)] overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#06131d]/95 shadow-2xl shadow-cyan-500/20 backdrop-blur-3xl">
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 pt-5">
                <div>
                  <p className="text-xs text-zinc-400">
                    LIVE ROOM
                  </p>

                  <h3 className="mt-1 text-sm font-semibold text-white">
                    {roomName}
                  </h3>

                  <p className="text-xs text-zinc-500">
                    {listeners} listening
                  </p>
                </div>

                <button
                  onClick={
                    leaveRoom
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              {/* PARTICIPANTS */}
              <div className="mt-5 flex items-center gap-3 px-5">
                {[
                  "A",
                  "M",
                  "R",
                  "S",
                ].map(
                  (
                    item,
                    index
                  ) => (
                    <motion.div
                      key={index}
                      animate={{
                        y: [
                          0,
                          -4,
                          0,
                        ],
                      }}
                      transition={{
                        duration:
                          1.8 +
                          index *
                            0.2,
                        repeat:
                          Infinity,
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-sm font-semibold text-white shadow-lg"
                    >
                      {item}
                    </motion.div>
                  )
                )}
              </div>

              {/* WAVEFORM */}
              <div className="mt-6 flex items-end justify-center gap-1 px-5">
                {Array.from({
                  length: 28,
                }).map(
                  (
                    _,
                    index
                  ) => (
                    <motion.div
                      key={index}
                      animate={{
                        height: [
                          8,
                          30,
                          14,
                          24,
                          10,
                        ],
                      }}
                      transition={{
                        duration:
                          1 +
                          index *
                            0.02,
                        repeat:
                          Infinity,
                      }}
                      className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-blue-400"
                    />
                  )
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-center gap-5 p-5">
                <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white">
                  <Volume2
                    size={20}
                  />
                </button>

                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-xl shadow-cyan-500/30"
                >
                  <Mic
                    size={22}
                  />
                </motion.button>

                <button
                  onClick={
                    leaveRoom
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
