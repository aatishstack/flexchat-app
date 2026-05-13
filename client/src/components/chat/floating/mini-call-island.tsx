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
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

export default function MiniCallIsland() {
  const [
    expanded,
    setExpanded,
  ] = useState(true);

  const [
    muted,
    setMuted,
  ] = useState(false);

  const [
    seconds,
    setSeconds,
  ] = useState(0);

  useEffect(() => {
    const interval =
      setInterval(() => {
        setSeconds(
          (
            prev
          ) => prev + 1
        );
      }, 1000);

    return () =>
      clearInterval(
        interval
      );
  }, []);

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    seconds % 60;

  return (
    <div className="relative">
      {/* COLLAPSED */}
      {!expanded && (
        <motion.button
          whileTap={{
            scale: 0.94,
          }}
          onClick={() =>
            setExpanded(true)
          }
          className="flex h-14 w-14 items-center justify-center rounded-full border border-green-400/20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-2xl shadow-green-500/20 backdrop-blur-2xl"
        >
          <motion.div
            animate={{
              scale: [
                1,
                1.12,
                1,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="h-3 w-3 rounded-full bg-green-400"
          />
        </motion.button>
      )}

      {/* EXPANDED */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            drag
            dragElastic={0.12}
            dragMomentum={false}
            whileDrag={{
              scale: 1.03,
            }}
            initial={{
              opacity: 0,
              scale: 0.7,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: -120,
            }}
            exit={{
              opacity: 0,
              scale: 0.7,
            }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 22,
            }}
            className="absolute bottom-0 right-0 z-[180]"
          >
            <div className="relative w-[320px] overflow-hidden rounded-[34px] border border-green-400/20 bg-black/60 shadow-2xl shadow-green-500/20 backdrop-blur-3xl">
              {/* GLOW */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />

              {/* HEADER */}
              <div className="relative z-10 flex items-center justify-between px-5 pt-5">
                <div>
                  <p className="text-xs text-zinc-400">
                    LIVE CALL
                  </p>

                  <h3 className="mt-1 text-sm font-semibold text-white">
                    Mayuri
                  </h3>

                  <p className="text-xs text-green-400">
                    {minutes}
                    :
                    {remainingSeconds
                      .toString()
                      .padStart(
                        2,
                        "0"
                      )}
                  </p>
                </div>

                {/* WAVE */}
                <div className="flex items-end gap-1">
                  {Array.from({
                    length: 5,
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
                            24,
                            12,
                            20,
                            10,
                          ],
                        }}
                        transition={{
                          duration:
                            1 +
                            index *
                              0.1,
                          repeat:
                            Infinity,
                        }}
                        className="w-1 rounded-full bg-green-400"
                      />
                    )
                  )}
                </div>
              </div>

              {/* AVATAR */}
              <div className="relative z-10 mt-5 flex justify-center">
                <motion.div
                  animate={{
                    scale: [
                      1,
                      1.04,
                      1,
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-2xl font-semibold text-white shadow-2xl shadow-green-500/30"
                >
                  M

                  <motion.div
                    animate={{
                      scale: [
                        1,
                        1.2,
                        1,
                      ],
                      opacity: [
                        0.4,
                        0,
                        0.4,
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat:
                        Infinity,
                    }}
                    className="absolute inset-0 rounded-full border border-green-400"
                  />
                </motion.div>
              </div>

              {/* CONTROLS */}
              <div className="relative z-10 flex items-center justify-center gap-5 p-6">
                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  onClick={() =>
                    setMuted(
                      !muted
                    )
                  }
                  className={
                    muted
                      ? "flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400"
                      : "flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white"
                  }
                >
                  {muted ? (
                    <MicOff
                      size={22}
                    />
                  ) : (
                    <Mic
                      size={22}
                    />
                  )}
                </motion.button>

                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-xl shadow-red-500/30"
                >
                  <PhoneOff
                    size={24}
                  />
                </motion.button>

                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <Video
                    size={22}
                  />
                </motion.button>
              </div>

              {/* MINIMIZE */}
              <button
                onClick={() =>
                  setExpanded(
                    false
                  )
                }
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