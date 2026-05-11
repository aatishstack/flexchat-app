"use client";

import Link from "next/link";
import FlexDock from "@/components/navigation/FlexDock";

import {
  ArrowLeft,
  Search,
  Flame,
  Sparkles,
  Users,
  Globe,
  Radio,
  Plus,
  BadgeCheck,
} from "lucide-react";

import { motion } from "framer-motion";

const trendingRooms = [
  {
    name: "Designers Hub",
    members: "12.4K",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    name: "AI Creators",
    members: "8.1K",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    name: "Gaming Arena",
    members: "18.7K",
    gradient: "from-purple-500 to-violet-500",
  },
];

const users = [
  {
    name: "Mayuri",
    username: "@mayuri",
    status: "Designing futuristic interfaces ✨",
    online: true,
  },
  {
    name: "Aarav",
    username: "@aarav",
    status: "Realtime systems engineer",
    online: false,
  },
  {
    name: "Nexus",
    username: "@nexus",
    status: "Building next-gen communities",
    online: true,
  },
];

export default function DiscoverPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        {/* BLOBS */}
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

        {/* GRID */}
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
                Discover
              </h1>

              <p className="mt-2 text-white/45">
                Explore communities & people
              </p>
            </div>
          </div>

          {/* SEARCH */}
          <div className="flex w-full max-w-xl items-center gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-3xl">
            <Search className="h-5 w-5 text-white/40" />

            <input
              placeholder="Search users, rooms, communities..."
              className="flex-1 bg-transparent outline-none placeholder:text-white/35"
            />

            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              <Sparkles className="h-5 w-5" />
            </button>
          </div>
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
                <Flame className="h-4 w-4 text-orange-300" />

                Trending Worldwide
              </div>

              <h2 className="mt-6 text-5xl font-black leading-tight">
                Find Your
                <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  {" "}
                  People
                </span>
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-white/55">
                Join realtime conversations, premium
                communities and discover creators from all
                around the world.
              </p>
            </div>

            {/* RIGHT */}
            <div className="grid grid-cols-2 gap-5">
              {[
                {
                  icon: Users,
                  label: "Active Users",
                  value: "2.4M+",
                },
                {
                  icon: Globe,
                  label: "Communities",
                  value: "12K+",
                },
                {
                  icon: Radio,
                  label: "Live Rooms",
                  value: "3.8K",
                },
                {
                  icon: Sparkles,
                  label: "Premium Creators",
                  value: "24K+",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={{
                    scale: 1.04,
                  }}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-3xl"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600/30 to-blue-500/30">
                    <item.icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-5 text-3xl font-black">
                    {item.value}
                  </h3>

                  <p className="mt-2 text-sm text-white/45">
                    {item.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* TRENDING */}
        <div className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              Trending Rooms
            </h2>

            <button className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3">
              <Plus className="h-5 w-5" />

              Create Room
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {trendingRooms.map((room, index) => (
              <motion.div
                key={index}
                whileHover={{
                  y: -6,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] backdrop-blur-3xl"
              >
                {/* TOP */}
                <div
                  className={`h-40 bg-gradient-to-br ${room.gradient}`}
                />

                {/* CONTENT */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black">
                      {room.name}
                    </h3>

                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                      {room.members}
                    </div>
                  </div>

                  <p className="mt-4 leading-relaxed text-white/50">
                    Join realtime discussions and premium
                    networking experiences.
                  </p>

                  <button className="mt-6 w-full rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                    Join Community
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* PEOPLE */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              Suggested People
            </h2>

            <button className="text-sm text-purple-300">
              View all
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {users.map((user, index) => (
              <motion.div
                key={index}
                whileHover={{
                  y: -5,
                }}
                className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl"
              >
                {/* TOP */}
                <div className="flex items-start justify-between">
                  {/* LEFT */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 text-2xl font-black shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                        {user.name.charAt(0)}
                      </div>

                      {user.online && (
                        <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#050816] bg-green-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black">
                          {user.name}
                        </h3>

                        <BadgeCheck className="h-5 w-5 text-cyan-300" />
                      </div>

                      <p className="mt-1 text-sm text-white/45">
                        {user.username}
                      </p>
                    </div>
                  </div>
                </div>

                {/* STATUS */}
                <p className="mt-5 leading-relaxed text-white/55">
                  {user.status}
                </p>

                {/* ACTIONS */}
                <div className="mt-6 flex gap-4">
                  <button className="flex-1 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                    Add Friend
                  </button>

                  <button className="rounded-3xl border border-white/10 bg-white/[0.04] px-5">
                    View
                  </button>
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