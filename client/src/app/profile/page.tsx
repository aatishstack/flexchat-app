"use client";

import Link from "next/link";
import FlexDock from "@/components/navigation/FlexDock";

import {
  ArrowLeft,
  BadgeCheck,
  Sparkles,
  Camera,
  ImageIcon,
  Heart,
  MessageCircle,
  Phone,
  Video,
  ShieldCheck,
  Star,
  Users,
  Globe,
  Zap,
} from "lucide-react";

import { motion } from "framer-motion";

const stats = [
  {
    icon: MessageCircle,
    value: "12.4K",
    label: "Messages",
  },
  {
    icon: Users,
    value: "2.1K",
    label: "Friends",
  },
  {
    icon: Globe,
    value: "84",
    label: "Communities",
  },
  {
    icon: Heart,
    value: "9.7K",
    label: "Reactions",
  },
];

const gallery = [
  "from-purple-500 to-blue-500",
  "from-pink-500 to-rose-500",
  "from-cyan-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-violet-500 to-indigo-500",
  "from-sky-500 to-cyan-500",
];

export default function ProfilePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
          }}
          className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-[120px]"
        />

        <motion.div
          animate={{
            x: [0, -60, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
          }}
          className="absolute bottom-[-120px] right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[120px]"
        />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>

            <div>
              <h1 className="text-5xl font-black">
                Profile
              </h1>

              <p className="mt-2 text-white/45">
                Premium social identity
              </p>
            </div>
          </div>

          {/* BADGE */}
          <div className="hidden items-center gap-3 rounded-full border border-purple-500/20 bg-purple-500/10 px-5 py-3 lg:flex">
            <Sparkles className="h-5 w-5 text-purple-300" />

            <span className="font-medium">
              FlexChat Premium
            </span>
          </div>
        </div>

        {/* PROFILE HERO */}
        <motion.div
          whileHover={{
            y: -4,
          }}
          className="relative mt-10 overflow-hidden rounded-[42px] border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-8 backdrop-blur-3xl"
        >
          {/* GLOW */}
          <div className="absolute right-[-100px] top-[-100px] h-[260px] w-[260px] rounded-full bg-purple-500/20 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">
            {/* LEFT */}
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              {/* AVATAR */}
              <div className="relative">
                {/* PING */}
                <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20 blur-xl" />

                {/* IMAGE */}
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 text-6xl font-black shadow-[0_20px_80px_rgba(139,92,246,0.45)]">
                  M

                  {/* CAMERA */}
                  <button className="absolute bottom-3 right-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                    <Camera className="h-6 w-6" />
                  </button>
                </div>

                {/* ONLINE */}
                <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 backdrop-blur-xl">
                  <div className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />

                  <span className="text-sm font-medium">
                    Online
                  </span>
                </div>
              </div>

              {/* INFO */}
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-5xl font-black">
                    Mayuri
                  </h2>

                  <BadgeCheck className="h-8 w-8 text-cyan-300" />
                </div>

                <p className="mt-3 text-xl text-white/45">
                  @mayuri
                </p>

                {/* BADGES */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {[
                    {
                      icon: Sparkles,
                      label: "Premium",
                    },
                    {
                      icon: ShieldCheck,
                      label: "Verified",
                    },
                    {
                      icon: Zap,
                      label: "Creator",
                    },
                  ].map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-xl"
                    >
                      <badge.icon className="h-4 w-4 text-purple-300" />

                      <span className="text-sm">
                        {badge.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* BIO */}
                <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/60">
                  Designing futuristic realtime experiences,
                  building premium communities and exploring
                  next-generation communication systems ✨
                </p>

                {/* ACTIONS */}
                <div className="mt-8 flex flex-wrap gap-4">
                  <button className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                    <MessageCircle className="h-5 w-5" />

                    Message
                  </button>

                  <button className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
                    <Phone className="h-6 w-6" />
                  </button>

                  <button className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
                    <Video className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* LEVEL CARD */}
            <div className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl">
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-yellow-300" />

                <span className="font-semibold">
                  Creator Level
                </span>
              </div>

              <h3 className="mt-6 text-6xl font-black">
                98
              </h3>

              <p className="mt-2 text-white/45">
                Elite Community Builder
              </p>

              {/* BAR */}
              <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: "82%",
                  }}
                  transition={{
                    duration: 1,
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                />
              </div>

              <p className="mt-3 text-sm text-white/40">
                82% progress to next level
              </p>
            </div>
          </div>
        </motion.div>

        {/* STATS */}
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{
                y: -5,
              }}
              className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600/30 to-blue-500/30">
                <stat.icon className="h-7 w-7" />
              </div>

              <h3 className="mt-6 text-5xl font-black">
                {stat.value}
              </h3>

              <p className="mt-3 text-white/45">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* MEDIA */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-6 w-6 text-cyan-300" />

              <h2 className="text-3xl font-black">
                Shared Media
              </h2>
            </div>

            <button className="text-sm text-purple-300">
              View all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-6">
            {gallery.map((gradient, index) => (
              <motion.div
                key={index}
                whileHover={{
                  y: -5,
                  scale: 1.03,
                }}
                className={`aspect-square rounded-[30px] bg-gradient-to-br ${gradient} shadow-[0_10px_40px_rgba(139,92,246,0.25)]`}
              />
            ))}
          </div>
        </div>
      </div>
      <FlexDock />
    </main>
  );
}