"use client";

import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
  Sparkles,
  Search,
  Ban,
  CheckCircle2,
  Clock3,
  BarChart3,
  Eye,
  MessageCircle,
} from "lucide-react";

import { motion } from "framer-motion";
import FlexDock from "@/components/navigation/FlexDock";

const stats = [
  {
    icon: Users,
    value: "2.4M+",
    label: "Active Users",
  },
  {
    icon: MessageCircle,
    value: "84M",
    label: "Messages Today",
  },
  {
    icon: Activity,
    value: "99.99%",
    label: "Realtime Uptime",
  },
  {
    icon: Shield,
    value: "1.2K",
    label: "Moderation Actions",
  },
];

const reports = [
  {
    user: "Mayuri",
    reason: "Spam activity detected",
    severity: "Medium",
    status: "Pending",
  },
  {
    user: "Nexus",
    reason: "Community guideline review",
    severity: "Low",
    status: "Reviewed",
  },
  {
    user: "Aarav",
    reason: "Suspicious login attempt",
    severity: "High",
    status: "Urgent",
  },
];

export default function AdminPage() {
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
      <div className="relative z-10 flex min-h-screen">
        {/* SIDEBAR */}
        <div className="hidden w-[320px] border-r border-white/10 bg-black/20 p-6 backdrop-blur-3xl lg:block">
          {/* LOGO */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[28px] bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              <Shield className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-3xl font-black">
                FlexAdmin
              </h1>

              <p className="text-sm text-white/40">
                Moderation Center
              </p>
            </div>
          </div>

          {/* NAV */}
          <div className="mt-12 space-y-4">
            {[
              "Overview",
              "Realtime Analytics",
              "Reports Queue",
              "Users",
              "Communities",
              "Moderation Logs",
              "Security",
            ].map((item, index) => (
              <motion.button
                key={index}
                whileHover={{
                  x: 6,
                }}
                className={`flex w-full items-center gap-4 rounded-3xl px-5 py-5 text-left transition-all ${
                  index === 0
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
                    : "border border-white/10 bg-white/[0.04]"
                }`}
              >
                <Sparkles className="h-5 w-5" />

                <span className="font-medium">
                  {item}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 px-6 py-10">
          {/* TOP */}
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            {/* LEFT */}
            <div>
              <h1 className="text-5xl font-black">
                Admin Dashboard
              </h1>

              <p className="mt-3 text-white/45">
                Premium realtime moderation & analytics
              </p>
            </div>

            {/* SEARCH */}
            <div className="flex w-full max-w-xl items-center gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-3xl">
              <Search className="h-5 w-5 text-white/40" />

              <input
                placeholder="Search users, reports, logs..."
                className="flex-1 bg-transparent outline-none placeholder:text-white/35"
              />
            </div>
          </div>

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

                <h2 className="mt-6 text-5xl font-black">
                  {stat.value}
                </h2>

                <p className="mt-3 text-white/45">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* ANALYTICS + REPORTS */}
          <div className="mt-14 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {/* ANALYTICS */}
            <motion.div
              whileHover={{
                y: -4,
              }}
              className="rounded-[40px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-3xl"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black">
                    Live Analytics
                  </h2>

                  <p className="mt-2 text-white/45">
                    Realtime platform metrics
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />

                  Live
                </div>
              </div>

              {/* CHART */}
              <div className="mt-10 flex h-[320px] items-end gap-4">
                {[40, 80, 55, 90, 72, 120, 96, 140].map(
                  (height, index) => (
                    <motion.div
                      key={index}
                      initial={{
                        height: 0,
                      }}
                      animate={{
                        height,
                      }}
                      transition={{
                        duration: 0.8,
                        delay: index * 0.05,
                      }}
                      className="flex-1 rounded-t-[24px] bg-gradient-to-t from-purple-600 to-cyan-400 shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
                    />
                  )
                )}
              </div>

              {/* BOTTOM */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Peak Load",
                    value: "84%",
                  },
                  {
                    label: "Realtime Sync",
                    value: "99.99%",
                  },
                  {
                    label: "Latency",
                    value: "12ms",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                  >
                    <p className="text-sm text-white/45">
                      {item.label}
                    </p>

                    <h3 className="mt-3 text-2xl font-black">
                      {item.value}
                    </h3>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* REPORTS */}
            <div className="rounded-[40px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-3xl">
              {/* HEADER */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black">
                    Reports Queue
                  </h2>

                  <p className="mt-2 text-white/45">
                    Moderation review system
                  </p>
                </div>

                <AlertTriangle className="h-8 w-8 text-orange-300" />
              </div>

              {/* LIST */}
              <div className="mt-8 space-y-5">
                {reports.map((report, index) => (
                  <motion.div
                    key={index}
                    whileHover={{
                      x: 4,
                    }}
                    className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5"
                  >
                    {/* TOP */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-black">
                          {report.user}
                        </h3>

                        <p className="mt-2 text-sm text-white/45">
                          {report.reason}
                        </p>
                      </div>

                      <div
                        className={`rounded-full px-3 py-2 text-xs font-bold ${
                          report.severity === "High"
                            ? "bg-red-500/20 text-red-300"
                            : report.severity === "Medium"
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {report.severity}
                      </div>
                    </div>

                    {/* BOTTOM */}
                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-white/45">
                        <Clock3 className="h-4 w-4" />

                        {report.status}
                      </div>

                      <div className="flex gap-3">
                        <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                          <Eye className="h-5 w-5" />
                        </button>

                        <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
                          <Ban className="h-5 w-5" />
                        </button>

                        <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10 text-green-300">
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* ACTION */}
              <button className="mt-8 flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 py-5 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                <BarChart3 className="h-5 w-5" />

                Open Full Moderation Panel
              </button>
            </div>
          </div>
        </div>
      </div>
      <FlexDock />
    </main>
  );
}