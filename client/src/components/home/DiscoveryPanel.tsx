"use client";

import {
  Sparkles,
  UserPlus,
  Globe,
  Zap,
  Shield,
  Flame,
} from "lucide-react";

import { motion } from "framer-motion";

const users = [
  {
    name: "Ariana",
    tag: "@ariana.wav",
    glow: "from-pink-500 to-rose-500",
  },
  {
    name: "Neo",
    tag: "@neo.realtime",
    glow: "from-cyan-500 to-blue-500",
  },
  {
    name: "Kira",
    tag: "@kira.motion",
    glow: "from-purple-500 to-violet-500",
  },
];

const features = [
  {
    icon: Globe,
    title: "Global Discovery",
  },
  {
    icon: Shield,
    title: "Private Profiles",
  },
  {
    icon: Zap,
    title: "Realtime Presence",
  },
  {
    icon: Flame,
    title: "Trending Users",
  },
];

export default function DiscoveryPanel() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 60,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.8,
      }}
      className="relative mt-10 overflow-hidden rounded-[42px] border border-white/10 bg-black/30 p-8 shadow-[0_20px_90px_rgba(139,92,246,0.16)] backdrop-blur-3xl"
    >
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.06] via-transparent to-blue-500/[0.06]" />

      {/* TOP */}
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [0, 12, -12, 0],
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
                Smart Discovery
              </h2>

              <p className="mt-1 text-white/50">
                AI powered social discovery engine
              </p>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{
                y: -4,
                scale: 1.03,
              }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-2xl"
            >
              <feature.icon className="h-5 w-5 text-purple-300" />

              <span className="text-sm font-medium text-white/70">
                {feature.title}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* USER CARDS */}
      <div className="relative mt-10 grid gap-5 xl:grid-cols-3">
        {users.map((user, index) => (
          <motion.div
            key={index}
            whileHover={{
              y: -8,
              scale: 1.03,
            }}
            className="group relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl"
          >
            {/* GLOW */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${user.glow} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.10]`}
            />

            {/* AVATAR */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              className={`relative h-24 w-24 rounded-full bg-gradient-to-br ${user.glow} shadow-[0_10px_40px_rgba(139,92,246,0.35)]`}
            >
              <div className="absolute inset-0 rounded-full bg-white/10" />

              {/* ONLINE */}
              <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-black bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
            </motion.div>

            {/* CONTENT */}
            <div className="mt-6">
              <h3 className="text-2xl font-black text-white">
                {user.name}
              </h3>

              <p className="mt-1 text-white/45">
                {user.tag}
              </p>
            </div>

            {/* BUTTON */}
            <motion.button
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.95,
              }}
              className={`mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r ${user.glow} px-5 py-4 font-semibold text-white shadow-2xl`}
            >
              <UserPlus className="h-5 w-5" />

              Connect
            </motion.button>

            {/* FLOATING LIGHT */}
            <motion.div
              animate={{
                x: [-200, 400],
              }}
              transition={{
                duration: 5,
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