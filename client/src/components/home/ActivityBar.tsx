"use client";

import {
  Music2,
  Headphones,
  Mic2,
  Radio,
  Sparkles,
} from "lucide-react";

import { motion } from "framer-motion";

const activities = [
  {
    icon: Music2,
    title: "Now Playing",
    subtitle: "After Hours • The Weeknd",
    color: "from-green-500 to-emerald-400",
  },
  {
    icon: Headphones,
    title: "Voice Channel",
    subtitle: "Realtime Dev Room",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Mic2,
    title: "Live Podcast",
    subtitle: "FlexChat Spaces",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Radio,
    title: "Trending Broadcast",
    subtitle: "2.4M users listening",
    color: "from-cyan-500 to-blue-500",
  },
];

export default function ActivityBar() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 50,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.8,
      }}
      className="relative mt-10 overflow-hidden rounded-[40px] border border-white/10 bg-black/30 p-6 shadow-[0_20px_80px_rgba(139,92,246,0.18)] backdrop-blur-3xl"
    >
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.05] via-transparent to-blue-500/[0.05]" />

      {/* TOP */}
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [0, 8, -8, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
              }}
              className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-2xl"
            >
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>

            <div>
              <h2 className="text-3xl font-black tracking-tight text-white">
                Live Activity
              </h2>

              <p className="mt-1 text-white/50">
                Premium realtime social presence
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="relative mt-8 grid gap-5 xl:grid-cols-4">
        {activities.map((activity, index) => (
          <motion.div
            key={index}
            whileHover={{
              y: -8,
              scale: 1.03,
            }}
            className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl"
          >
            {/* GLOW */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${activity.color} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.10]`}
            />

            {/* TOP */}
            <div className="relative flex items-start justify-between">
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${activity.color} shadow-[0_10px_40px_rgba(139,92,246,0.35)]`}
              >
                <activity.icon className="h-7 w-7 text-white" />
              </motion.div>

              <motion.div
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
                className="h-3 w-3 rounded-full bg-green-400"
              />
            </div>

            {/* CONTENT */}
            <div className="relative mt-6">
              <h3 className="text-lg font-bold text-white">
                {activity.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {activity.subtitle}
              </p>
            </div>

            {/* MUSIC BARS */}
            <div className="relative mt-6 flex items-end gap-[4px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [
                      `${Math.random() * 10 + 10}px`,
                      `${Math.random() * 30 + 20}px`,
                      `${Math.random() * 10 + 10}px`,
                    ],
                  }}
                  transition={{
                    duration: Math.random() * 1 + 0.8,
                    repeat: Infinity,
                  }}
                  className={`w-[5px] rounded-full bg-gradient-to-t ${activity.color}`}
                />
              ))}
            </div>

            {/* MOVING LIGHT */}
            <motion.div
              animate={{
                x: [-200, 400],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute bottom-0 h-[2px] w-24 bg-white/70"
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}