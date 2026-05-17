"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Pause,
  SkipBack,
  SkipForward,
  X,
  Music2,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useMusicStore } from "../../../store/music-store";

export default function DynamicMusicIsland() {
  const [
    expanded,
    setExpanded,
  ] = useState(false);
  const {
    playing,
    song,
    artist,
    toggle,
  } = useMusicStore();

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  function startHideTimer() {
    if (
      timerRef.current
    ) {
      clearTimeout(
        timerRef.current
      );
    }

    timerRef.current =
      setTimeout(() => {
        setExpanded(false);
      }, 3000);
  }

  function showPlayer() {
    setExpanded(true);

    startHideTimer();
  }

  useEffect(() => {
    return () => {
      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* MUSIC BUTTON */}
      <motion.button
        whileHover={{
          scale: expanded
            ? 1
            : 1.05,
        }}
        whileTap={{
          scale: 0.95,
        }}
        onClick={showPlayer}
        animate={{
          opacity: expanded
            ? 0
            : 1,
          scale: expanded
            ? 0.7
            : 1,
        }}
        transition={{
          duration: 0.25,
        }}
        className="relative z-[150] flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 text-white shadow-2xl shadow-purple-500/30 backdrop-blur-2xl sm:h-14 sm:w-14"
      >
        <motion.div
          animate={{
            scale: [
              1,
              1.1,
              1,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <Music2
            size={24}
          />
        </motion.div>

        <svg
          className="absolute inset-0"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="rgba(168,85,247,0.7)"
            strokeWidth="5"
            fill="none"
            strokeDasharray="289"
            strokeDashoffset="90"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>

      {/* EXPANDED PLAYER */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.12}
            whileDrag={{
              scale: 1.04,
            }}
            initial={{
              opacity: 0,
              scale: 0.7,
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
            <div className="relative w-[min(calc(100vw-1.5rem),310px)] overflow-hidden rounded-[28px] border border-purple-500/20 bg-[#12091f]/95 shadow-2xl shadow-purple-500/30 backdrop-blur-3xl">
              {/* GLOW */}
              <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10" />

              {/* HEADER */}
              <div className="relative z-10 flex items-center justify-between px-5 pt-4">
                <div>
                  <p className="text-xs text-zinc-400">
                    NOW PLAYING
                  </p>

                  <h3 className="mt-1 text-sm font-semibold text-white">
                    {song}
                  </h3>

                  <p className="text-xs text-zinc-500">
                    {artist}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setExpanded(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              {/* VISUALIZER */}
              <div className="relative z-10 mt-4 flex items-end justify-center gap-1 px-5">
                {Array.from({
                  length: 24,
                }).map(
                  (
                    _,
                    index
                  ) => (
                    <motion.div
                      key={index}
                      animate={{
                        height: [
                          10,
                          26,
                          14,
                          32,
                          12,
                        ],
                      }}
                      transition={{
                        duration:
                          1 +
                          index *
                            0.03,
                        repeat:
                          Infinity,
                      }}
                      className="w-1 rounded-full bg-gradient-to-t from-purple-500 to-fuchsia-400"
                    />
                  )
                )}
              </div>

              {/* PROGRESS */}
              <div className="relative z-10 px-5 pb-2 pt-5">
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    animate={{
                      width:
                        "42%",
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                  />
                </div>
              </div>

              {/* CONTROLS */}
              <div className="relative z-10 flex items-center justify-center gap-5 p-5">
                <button className="text-white/70 transition hover:text-white">
                  <SkipBack
                    size={20}
                  />
                </button>

                <motion.button
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={toggle}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-xl shadow-purple-500/30"
                >
                  {playing ? (
                    <Pause size={24} />
                  ) : (
                    <Music2 size={24} />
                  )}
                </motion.button>

                <button className="text-white/70 transition hover:text-white">
                  <SkipForward
                    size={20}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
