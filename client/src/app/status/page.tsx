"use client";

import Link from "next/link";
import FlexDock from "@/components/navigation/FlexDock";

import {
  ArrowLeft,
  Plus,
  Eye,
  Heart,
  MessageCircle,
  Sparkles,
  BadgeCheck,
  Play,
} from "lucide-react";

import { motion } from "framer-motion";

const stories = [
  {
    name: "Mayuri",
    views: "12.4K",
    reactions: "3.2K",
    gradient: "from-pink-500 via-purple-500 to-blue-500",
    active: true,
  },
  {
    name: "Aarav",
    views: "8.7K",
    reactions: "1.8K",
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    active: true,
  },
  {
    name: "Nexus",
    views: "18.1K",
    reactions: "5.6K",
    gradient: "from-orange-500 via-rose-500 to-pink-500",
    active: false,
  },
];

export default function StatusPage() {
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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
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
                Status
              </h1>

              <p className="mt-2 text-white/45">
                Live moments & premium stories
              </p>
            </div>
          </div>

          {/* CREATE */}
          <button className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
            <Plus className="h-5 w-5" />

            Add Story
          </button>
        </div>

        {/* HERO */}
        <motion.div
          whileHover={{
            y: -4,
          }}
          className="relative mt-10 overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-8 backdrop-blur-3xl"
        >
          {/* GLOW */}
          <div className="absolute right-[-100px] top-[-100px] h-[240px] w-[240px] rounded-full bg-purple-500/20 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* LEFT */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-300" />

                Premium Story Engine
              </div>

              <h2 className="mt-6 text-5xl font-black leading-tight">
                Share
                <span className="bg-gradient-to-r from-pink-300 to-cyan-300 bg-clip-text text-transparent">
                  {" "}
                  Moments
                </span>
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-white/55">
                Express yourself with immersive realtime
                stories, animated statuses and premium social
                presence.
              </p>
            </div>

            {/* PREVIEW */}
            <motion.div
              whileHover={{
                scale: 1.03,
              }}
              className="relative h-[420px] w-full max-w-[260px] overflow-hidden rounded-[42px] border border-white/10 bg-black shadow-[0_20px_80px_rgba(139,92,246,0.35)]"
            >
              {/* BG */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500" />

              {/* OVERLAY */}
              <div className="absolute inset-0 bg-black/20" />

              {/* CONTENT */}
              <div className="relative z-10 flex h-full flex-col justify-between p-6">
                {/* TOP */}
                <div>
                  {/* BARS */}
                  <div className="flex gap-2">
                    <div className="h-1 flex-1 rounded-full bg-white" />
                    <div className="h-1 flex-1 rounded-full bg-white/30" />
                    <div className="h-1 flex-1 rounded-full bg-white/30" />
                  </div>

                  {/* USER */}
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-black/20 text-xl font-black backdrop-blur-xl">
                      M
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">
                          Mayuri
                        </h3>

                        <BadgeCheck className="h-4 w-4 text-cyan-200" />
                      </div>

                      <p className="text-sm text-white/70">
                        Just now
                      </p>
                    </div>
                  </div>
                </div>

                {/* CENTER */}
                <div className="text-center">
                  <h3 className="text-4xl font-black leading-tight">
                    FlexChat
                    <br />
                    Stories 😈🔥
                  </h3>
                </div>

                {/* BOTTOM */}
                <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />

                    <span>12.4K</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />

                    <span>3.2K</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* STORIES */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              Trending Stories
            </h2>

            <button className="text-sm text-purple-300">
              Explore all
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story, index) => (
              <motion.div
                key={index}
                whileHover={{
                  y: -6,
                }}
                className="group relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] backdrop-blur-3xl"
              >
                {/* IMAGE */}
                <div
                  className={`relative h-[520px] bg-gradient-to-br ${story.gradient}`}
                >
                  {/* OVERLAY */}
                  <div className="absolute inset-0 bg-black/20" />

                  {/* TOP */}
                  <div className="absolute left-0 right-0 top-0 z-10 p-5">
                    {/* STORY BAR */}
                    <div className="flex gap-2">
                      <div className="h-1 flex-1 rounded-full bg-white" />

                      <div className="h-1 flex-1 rounded-full bg-white/30" />

                      <div className="h-1 flex-1 rounded-full bg-white/30" />
                    </div>

                    {/* USER */}
                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* AVATAR */}
                        <div
                          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 ${
                            story.active
                              ? "border-green-400"
                              : "border-white"
                          } bg-black/20 text-2xl font-black backdrop-blur-xl`}
                        >
                          {story.name.charAt(0)}

                          {story.active && (
                            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-black bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
                          )}
                        </div>

                        {/* TEXT */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black">
                              {story.name}
                            </h3>

                            <BadgeCheck className="h-5 w-5 text-cyan-200" />
                          </div>

                          <p className="mt-1 text-sm text-white/70">
                            2 mins ago
                          </p>
                        </div>
                      </div>

                      {/* PLAY */}
                      <button className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/20 backdrop-blur-xl">
                        <Play className="h-6 w-6 fill-white" />
                      </button>
                    </div>
                  </div>

                  {/* CENTER */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h2 className="text-center text-5xl font-black leading-tight">
                      Premium
                      <br />
                      Stories ✨
                    </h2>
                  </div>

                  {/* BOTTOM */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
                    <div className="rounded-[30px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                      {/* STATS */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="h-5 w-5" />

                          <span>{story.views}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5" />

                          <span>{story.reactions}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5" />

                          <span>Reply</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* HOVER GLOW */}
                <div className="absolute inset-0 opacity-0 transition-all duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 rounded-[40px] border border-white/20" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <FlexDock />
    </main>
  );
}