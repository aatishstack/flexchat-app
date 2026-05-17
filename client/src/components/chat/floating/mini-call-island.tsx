"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { useCallStore } from "../../../store/call-store";

export default function MiniCallIsland() {
  const {
    status,
    caller,
    isMuted,
    isVideoEnabled,
    acceptCall,
    minimizeCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCallStore();

  const [seconds, setSeconds] =
    useState(0);

  const isVisible =
    status === "active" ||
    status === "minimized" ||
    status === "ringing";
  const expanded =
    status === "active" ||
    status === "ringing";

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    const interval =
      setInterval(() => {
        setSeconds(
          (prev) => prev + 1
        );
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [status]);

  if (!isVisible) {
    return null;
  }

  const minutes =
    Math.floor(seconds / 60);
  const remainingSeconds =
    seconds % 60;
  const callLabel =
    status === "ringing"
      ? "Calling"
      : "Live call";

  return (
    <div className="relative">
      <motion.button
        whileTap={{
          scale: 0.94,
        }}
        onClick={acceptCall}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-400/20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-2xl shadow-green-500/20 backdrop-blur-2xl sm:h-14 sm:w-14"
        aria-label="Open call controls"
      >
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="h-3 w-3 rounded-full bg-green-400"
        />
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.92,
              y: 12,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.92,
              y: 12,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 24,
            }}
            className="absolute bottom-[calc(100%+0.75rem)] right-0 z-[180]"
          >
            <div className="relative w-[min(calc(100vw-1.5rem),320px)] overflow-hidden rounded-[28px] border border-green-400/20 bg-[#07120f]/95 shadow-2xl shadow-green-500/20 backdrop-blur-3xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />

              <div className="relative z-10 flex items-center justify-between px-5 pt-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                    {callLabel}
                  </p>

                  <h3 className="mt-1 text-sm font-semibold text-white">
                    {caller}
                  </h3>

                  <p className="text-xs text-green-400">
                    {minutes}:
                    {remainingSeconds
                      .toString()
                      .padStart(2, "0")}
                  </p>
                </div>

                <div className="flex items-end gap-1">
                  {Array.from({
                    length: 5,
                  }).map((_, index) => (
                    <motion.div
                      key={index}
                      animate={{
                        height: [
                          10,
                          24,
                          12,
                          20,
                          10,
                        ],
                      }}
                      transition={{
                        duration:
                          1 + index * 0.1,
                        repeat: Infinity,
                      }}
                      className="w-1 rounded-full bg-green-400"
                    />
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-5 flex justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.04, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-2xl font-semibold text-white shadow-2xl shadow-green-500/30 sm:h-24 sm:w-24"
                >
                  {caller
                    .charAt(0)
                    .toUpperCase()}

                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 0, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="absolute inset-0 rounded-full border border-green-400"
                  />
                </motion.div>
              </div>

              <div className="relative z-10 flex items-center justify-center gap-4 p-5 sm:gap-5 sm:p-6">
                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  onClick={toggleMute}
                  className={
                    isMuted
                      ? "flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-300 sm:h-14 sm:w-14"
                      : "flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white sm:h-14 sm:w-14"
                  }
                  aria-label={
                    isMuted
                      ? "Unmute"
                      : "Mute"
                  }
                >
                  {isMuted ? (
                    <MicOff size={22} />
                  ) : (
                    <Mic size={22} />
                  )}
                </motion.button>

                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  onClick={endCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-xl shadow-red-500/30 sm:h-16 sm:w-16"
                  aria-label="End call"
                >
                  <PhoneOff size={24} />
                </motion.button>

                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  onClick={toggleVideo}
                  className={
                    isVideoEnabled
                      ? "flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white sm:h-14 sm:w-14"
                      : "flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-300 sm:h-14 sm:w-14"
                  }
                  aria-label={
                    isVideoEnabled
                      ? "Disable video"
                      : "Enable video"
                  }
                >
                  {isVideoEnabled ? (
                    <Video size={22} />
                  ) : (
                    <VideoOff size={22} />
                  )}
                </motion.button>
              </div>

              <button
                onClick={minimizeCall}
                className="absolute right-4 top-4 z-20 rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
              >
                Minimize
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
