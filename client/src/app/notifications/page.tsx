"use client";

import Link from "next/link";
import FlexDock from "@/components/navigation/FlexDock";

import {
  ArrowLeft,
  Bell,
  MessageCircle,
  Phone,
  Users,
  Sparkles,
  Heart,
  BadgeCheck,
  Video,
  ShieldCheck,
  Check,
} from "lucide-react";

import { motion } from "framer-motion";

const notifications = [
  {
    icon: MessageCircle,
    title: "Realtime Messaging",
    description:
      "Ultra fast encrypted communication.",
    time: "Live",
    gradient: "from-purple-500 to-blue-500",
    unread: false,
  },
  {
    icon: ShieldCheck,
    title: "Privacy Protected",
    description:
      "Secure conversations with modern protection.",
    time: "Secure",
    gradient: "from-cyan-500 to-blue-500",
    unread: false,
  },
];

export default function NotificationsPage() {
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
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10">
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
                Notifications
              </h1>

              <p className="mt-2 text-white/45">
                Live activity & realtime updates
              </p>
            </div>
          </div>

          {/* ACTION */}
          <button className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
            <Check className="h-5 w-5" />

            Mark all as read
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

                Realtime Notification Engine
              </div>

              <h2 className="mt-6 text-5xl font-black leading-tight">
                Stay
                <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  {" "}
                  Updated
                </span>
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-white/55">
                Receive ultra-fast realtime notifications,
                secure activity alerts and live communication
                updates instantly.
              </p>
            </div>

            {/* RIGHT */}
            <div className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_20px_80px_rgba(139,92,246,0.45)]">
                <Bell className="h-10 w-10" />
              </div>

              <h3 className="mt-6 text-5xl font-black">
                24
              </h3>

              <p className="mt-2 text-white/45">
                New notifications today
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />

                Realtime synced
              </div>
            </div>
          </div>
        </motion.div>

        {/* LIST */}
        <div className="mt-14 space-y-5">
          {notifications.map((item, index) => (
            <motion.div
              key={index}
              whileHover={{
                y: -4,
              }}
              className={`relative overflow-hidden rounded-[36px] border p-6 backdrop-blur-3xl ${
                item.unread
                  ? "border-purple-500/20 bg-purple-500/[0.08]"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              {/* GLOW */}
              <div
                className={`absolute right-[-60px] top-[-60px] h-[160px] w-[160px] rounded-full bg-gradient-to-br ${item.gradient} opacity-10 blur-[80px]`}
              />

              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                {/* LEFT */}
                <div className="flex items-start gap-5">
                  {/* ICON */}
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br ${item.gradient} shadow-[0_10px_40px_rgba(139,92,246,0.35)]`}
                  >
                    <item.icon className="h-8 w-8 text-white" />
                  </div>

                  {/* TEXT */}
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-black">
                        {item.title}
                      </h3>

                      {item.unread && (
                        <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
                          NEW
                        </div>
                      )}
                    </div>

                    <p className="mt-3 max-w-2xl leading-relaxed text-white/55">
                      {item.description}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">
                        <ShieldCheck className="h-4 w-4 text-cyan-300" />

                        Secure event
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">
                        <BadgeCheck className="h-4 w-4 text-green-300" />

                        Verified source
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col items-start gap-4 md:items-end">
                  <span className="text-sm text-white/40">
                    {item.time}
                  </span>

                  <button className="rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                    Open
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <FlexDock />
    </main>
  );
}