"use client";

import Link from "next/link";
import FlexDock from "@/components/navigation/FlexDock";

import {
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  BadgeCheck,
  Sparkles,
  Globe,
  MessageCircle,
  Phone,
  Video,
  Check,
  X,
} from "lucide-react";

import { motion } from "framer-motion";

const onlineFriends = [
  {
    name: "Mayuri",
    username: "@mayuri",
    mutual: "24 mutual friends",
    status: "Designing futuristic interfaces ✨",
    online: true,
  },
  {
    name: "Aarav",
    username: "@aarav",
    mutual: "12 mutual friends",
    status: "Building realtime systems",
    online: true,
  },
  {
    name: "Nexus",
    username: "@nexus",
    mutual: "42 mutual friends",
    status: "Creator & community builder",
    online: true,
  },
];

const requests = [
  {
    name: "Riya",
    username: "@riya",
    mutual: "8 mutual friends",
  },
  {
    name: "Karan",
    username: "@karan",
    mutual: "14 mutual friends",
  },
];

export default function FriendsPage() {
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
                Friends
              </h1>

              <p className="mt-2 text-white/45">
                Your realtime social network
              </p>
            </div>
          </div>

          {/* SEARCH */}
          <div className="flex w-full max-w-xl items-center gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-3xl">
            <Search className="h-5 w-5 text-white/40" />

            <input
              placeholder="Search friends..."
              className="flex-1 bg-transparent outline-none placeholder:text-white/35"
            />

            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              <UserPlus className="h-5 w-5" />
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
                <Sparkles className="h-4 w-4 text-purple-300" />

                Premium Social Layer
              </div>

              <h2 className="mt-6 text-5xl font-black leading-tight">
                Build Your
                <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  {" "}
                  Circle
                </span>
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-white/55">
                Connect with creators, friends and premium
                communities across the realtime FlexChat
                ecosystem.
              </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-5">
              {[
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
                  icon: MessageCircle,
                  value: "12K+",
                  label: "Chats",
                },
                {
                  icon: Sparkles,
                  value: "98",
                  label: "Social Rank",
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

        {/* FRIEND REQUESTS */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              Friend Requests
            </h2>

            <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-300">
              {requests.length} Pending
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {requests.map((user, index) => (
              <motion.div
                key={index}
                whileHover={{
                  y: -4,
                }}
                className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  {/* LEFT */}
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 text-3xl font-black shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                      {user.name.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black">
                          {user.name}
                        </h3>

                        <BadgeCheck className="h-5 w-5 text-cyan-300" />
                      </div>

                      <p className="mt-2 text-white/45">
                        {user.username}
                      </p>

                      <p className="mt-3 text-sm text-white/35">
                        {user.mutual}
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-4">
                    <button className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_10px_40px_rgba(16,185,129,0.35)]">
                      <Check className="h-6 w-6" />
                    </button>

                    <button className="flex h-14 w-14 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 text-red-300">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ONLINE FRIENDS */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              Online Friends
            </h2>

            <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />

              Live
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {onlineFriends.map((user, index) => (
              <motion.div
                key={index}
                whileHover={{
                  y: -6,
                }}
                className="relative overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl"
              >
                {/* GLOW */}
                <div className="absolute right-[-60px] top-[-60px] h-[180px] w-[180px] rounded-full bg-purple-500/20 blur-[80px]" />

                <div className="relative z-10">
                  {/* TOP */}
                  <div className="flex items-start justify-between">
                    {/* LEFT */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 text-3xl font-black shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                          {user.name.charAt(0)}
                        </div>

                        {user.online && (
                          <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-[#050816] bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-black">
                            {user.name}
                          </h3>

                          <BadgeCheck className="h-5 w-5 text-cyan-300" />
                        </div>

                        <p className="mt-2 text-white/45">
                          {user.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* STATUS */}
                  <p className="mt-6 leading-relaxed text-white/55">
                    {user.status}
                  </p>

                  {/* MUTUAL */}
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">
                    <Users className="h-4 w-4 text-purple-300" />

                    {user.mutual}
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-8 flex gap-4">
                    <button className="flex-1 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                      Message
                    </button>

                    <button className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
                      <Phone className="h-5 w-5" />
                    </button>

                    <button className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
                      <Video className="h-5 w-5" />
                    </button>
                  </div>
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