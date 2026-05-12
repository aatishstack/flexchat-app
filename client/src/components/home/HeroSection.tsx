"use client";

import {
  ArrowRight,
  Shield,
  Zap,
  Globe,
} from "lucide-react";

import { motion } from "framer-motion";

const stats = [
  {
    title: "Realtime Speed",
    value: "12ms",
  },
  {
    title: "Secure Chats",
    value: "AES-256",
  },
  {
    title: "Global Users",
    value: "2.4M+",
  },
];

export default function HeroSection() {

  return (

    <div className="relative flex flex-1 overflow-hidden">

      {/* LEFT */}

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-16 lg:px-20">

        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.7,
          }}
          className="max-w-5xl"
        >

          {/* BADGE */}

          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 py-2 backdrop-blur-2xl">

            <Zap className="h-4 w-4 text-cyan-300" />

            <span className="text-sm font-medium text-cyan-100">

              FlexChat Premium Platform

            </span>

          </div>

          {/* TITLE */}

          <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl xl:text-8xl">

            Messaging
            <br />

            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">

              Reimagined

            </span>

          </h1>

          {/* DESC */}

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">

            FlexChat delivers realtime communication,
            modern discovery systems,
            smooth performance,
            and premium privacy controls
            inside one polished platform.

          </p>

          {/* BUTTONS */}

          <div className="mt-10 flex flex-wrap gap-5">

            <motion.button
              whileHover={{
                scale: 1.03,
              }}
              whileTap={{
                scale: 0.96,
              }}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 font-semibold text-black shadow-2xl shadow-cyan-500/20"
            >

              Launch FlexChat

              <ArrowRight className="h-5 w-5" />

            </motion.button>

            <button
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 font-semibold text-white backdrop-blur-2xl"
            >

              Explore Features

            </button>

          </div>

          {/* STATS */}

          <div className="mt-14 grid gap-5 md:grid-cols-3">

            {stats.map(
              (
                stat,
                index
              ) => (

                <motion.div
                  key={index}
                  whileHover={{
                    y: -5,
                  }}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl"
                >

                  <p className="text-sm text-white/50">

                    {stat.title}

                  </p>

                  <h3 className="mt-3 text-3xl font-black text-white">

                    {stat.value}

                  </h3>

                </motion.div>
              )
            )}

          </div>

        </motion.div>

      </div>

      {/* RIGHT */}

      <div className="relative hidden w-[42%] items-center justify-center xl:flex">

        {/* GLOW */}

        <div className="absolute h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-3xl" />

        {/* CHAT CARD */}

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
            duration: 1,
          }}
          className="relative z-10 w-[420px] overflow-hidden rounded-[40px] border border-white/10 bg-[#081018]/95 shadow-[0_0_80px_rgba(0,255,255,0.08)] backdrop-blur-3xl"
        >

          {/* TOP */}

          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

            <div className="flex items-center gap-4">

              <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500">

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

          </div>

          {/* CHAT */}

          <div className="space-y-5 p-6">

            <div className="max-w-[80%] rounded-3xl rounded-bl-md bg-white/10 px-5 py-4 text-white">

              FlexChat finally feels production ready 🔥

            </div>

            <div className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-4 text-black">

              Smooth realtime messaging + clean UI 😈

            </div>

            <div className="flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-3">

              <div className="h-2 w-2 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-white" />

            </div>

          </div>

        </motion.div>

        {/* FEATURE CARD */}

        <div className="absolute left-0 top-24 w-[260px] rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500">

              <Shield className="h-6 w-6 text-white" />

            </div>

            <div>

              <h4 className="font-semibold text-white">

                Secure Messaging

              </h4>

              <p className="text-sm text-white/50">

                Privacy focused architecture

              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}