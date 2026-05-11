"use client";

import {
  ArrowRight,
  Shield,
  Sparkles,
  Zap,
  Globe,
  Lock,
  Play,
} from "lucide-react";

import { motion } from "framer-motion";

const stats = [
  {
    title: "Realtime Delivery",
    value: "12ms",
  },
  {
    title: "Global Users",
    value: "2.4M+",
  },
  {
    title: "Encrypted",
    value: "AES-256",
  },
];

const features = [
  {
    icon: Zap,
    title: "Lightning Messaging",
    desc: "Socket powered realtime architecture with instant sync.",
  },
  {
    icon: Shield,
    title: "Advanced Privacy",
    desc: "Granular controls inspired by Telegram & Signal.",
  },
  {
    icon: Globe,
    title: "Global Infrastructure",
    desc: "Scalable delivery system optimized for low latency.",
  },
  {
    icon: Lock,
    title: "Secure Sessions",
    desc: "Protected authentication with future-ready security.",
  },
];

export default function HeroSection() {
  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* LEFT */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-16 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl"
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 20px rgba(168,85,247,0.2)",
                "0 0 50px rgba(59,130,246,0.35)",
                "0 0 20px rgba(168,85,247,0.2)",
              ],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
            }}
            className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 backdrop-blur-2xl"
          >
            <Sparkles className="h-4 w-4 text-purple-400" />

            <span className="text-sm font-medium text-white/80">
              FlexChat Premium Experience
            </span>
          </motion.div>

          <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl xl:text-8xl">
            Social Messaging
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Built For The Future
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">
            FlexChat combines immersive realtime communication,
            modern discovery systems, smooth animations,
            advanced privacy, and production-grade infrastructure
            into one deeply polished platform.
          </p>

          <div className="mt-10 flex flex-wrap gap-5">
            <motion.button
              whileHover={{
                scale: 1.04,
                y: -4,
              }}
              whileTap={{ scale: 0.95 }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-violet-500 to-blue-500 px-8 py-4 font-semibold text-white shadow-2xl shadow-purple-500/30"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="absolute inset-0 bg-white/10" />
              </div>

              <span className="relative flex items-center gap-2">
                Launch FlexChat
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.04,
                y: -4,
              }}
              whileTap={{ scale: 0.95 }}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-7 py-4 font-semibold text-white backdrop-blur-2xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Play className="ml-1 h-4 w-4" />
              </div>

              Watch Preview
            </motion.button>
          </div>

          {/* STATS */}
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10" />
                </div>

                <div className="relative">
                  <p className="text-sm text-white/50">
                    {stat.title}
                  </p>

                  <h3 className="mt-3 text-3xl font-black text-white">
                    {stat.value}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE */}
      <div className="relative hidden w-[42%] items-center justify-center overflow-hidden xl:flex">
        {/* BIG GLOW */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="absolute h-[700px] w-[700px] rounded-full bg-purple-600/20 blur-3xl"
        />

        {/* FLOATING CHAT WINDOW */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 w-[420px] overflow-hidden rounded-[40px] border border-white/10 bg-black/40 shadow-[0_0_80px_rgba(139,92,246,0.25)] backdrop-blur-3xl"
        >
          {/* TOP */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black bg-green-400" />
              </div>

              <div>
                <h3 className="font-semibold text-white">
                  Mayuri
                </h3>

                <p className="text-sm text-green-400">
                  online now
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
          </div>

          {/* CHAT */}
          <div className="space-y-5 p-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-[80%] rounded-3xl rounded-bl-md bg-white/10 px-5 py-4 text-white backdrop-blur-xl"
            >
              The new FlexChat UI feels insanely smooth 🔥
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-4 text-white"
            >
              Wait till you see realtime animations & APK build 👀
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
              className="flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-3"
            >
              <div className="h-2 w-2 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* FLOATING FEATURE CARD */}
        <motion.div
          animate={{
            y: [0, -14, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
          className="absolute left-0 top-24 z-20 w-[260px] rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500">
              <Zap className="h-6 w-6 text-white" />
            </div>

            <div>
              <h4 className="font-semibold text-white">
                Live Realtime
              </h4>

              <p className="text-sm text-white/50">
                Instant sync system
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}