"use client";

import {
  Sparkles,
  Send,
  Mic,
  Bot,
  Zap,
  Brain,
  MessageCircle,
  ShieldCheck,
  Wand2,
  ImageIcon,
  Headphones,
} from "lucide-react";
import FlexDock from "@/components/navigation/FlexDock";

import { motion } from "framer-motion";

const suggestions = [
  "Summarize unread conversations",
  "Generate community announcement",
  "Create premium bio ideas",
  "Draft a realtime reply",
];

const chats = [
  {
    role: "ai",
    message:
      "Hey Mayuri ✨ I analyzed your recent conversations and generated smart reply suggestions for faster communication.",
  },
  {
    role: "user",
    message:
      "Generate a futuristic welcome message for my community.",
  },
  {
    role: "ai",
    message:
      "Welcome to the future of realtime communication 🚀 Experience premium discussions, live collaboration and next-generation social interaction inside FlexChat.",
  },
];

export default function AIPage() {
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
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10">
        {/* HEADER */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-5">
            {/* AI ICON */}
            <motion.div
              animate={{
                rotate: [0, 8, -8, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
              }}
              className="flex h-20 w-20 items-center justify-center rounded-[32px] bg-gradient-to-br from-purple-600 to-cyan-500 shadow-[0_20px_80px_rgba(139,92,246,0.45)]"
            >
              <Bot className="h-10 w-10" />
            </motion.div>

            {/* TEXT */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-black">
                  Trisha AI
                </h1>

                <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-300">
                  BETA
                </div>
              </div>

              <p className="mt-3 text-white/45">
                Your premium realtime AI companion
              </p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-4">
            <button className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-4 backdrop-blur-3xl">
              <Headphones className="h-5 w-5" />

              Voice Mode
            </button>

            <button className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-4 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              <Sparkles className="h-5 w-5" />

              Upgrade AI
            </button>
          </div>
        </div>

        {/* HERO */}
        <motion.div
          whileHover={{
            y: -4,
          }}
          className="relative mt-10 overflow-hidden rounded-[42px] border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-8 backdrop-blur-3xl"
        >
          {/* GLOW */}
          <div className="absolute right-[-120px] top-[-120px] h-[280px] w-[280px] rounded-full bg-purple-500/20 blur-[120px]" />

          <div className="relative z-10 grid gap-10 xl:grid-cols-[1fr_420px]">
            {/* LEFT */}
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm">
                <Brain className="h-4 w-4 text-cyan-300" />

                Neural Realtime Intelligence
              </div>

              <h2 className="mt-6 text-6xl font-black leading-tight">
                AI Powered
                <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  {" "}
                  Communication
                </span>
              </h2>

              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/55">
                Generate smart replies, summarize messages,
                automate workflows and unlock next-generation
                productivity directly inside FlexChat.
              </p>

              {/* FEATURES */}
              <div className="mt-10 grid gap-5 md:grid-cols-2">
                {[
                  {
                    icon: Zap,
                    title: "Realtime Suggestions",
                    desc: "AI-generated instant replies",
                  },
                  {
                    icon: Wand2,
                    title: "Smart Generation",
                    desc: "Create bios, announcements & posts",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Private AI Processing",
                    desc: "Secure encrypted workflows",
                  },
                  {
                    icon: ImageIcon,
                    title: "Media Intelligence",
                    desc: "Analyze & organize media instantly",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{
                      y: -4,
                    }}
                    className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-3xl"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600/30 to-cyan-500/30">
                      <item.icon className="h-6 w-6" />
                    </div>

                    <h3 className="mt-5 text-2xl font-black">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-white/45">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CHAT */}
            <div className="rounded-[38px] border border-white/10 bg-black/20 p-5 backdrop-blur-3xl">
              {/* TOP */}
              <div className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                      <Bot className="h-7 w-7" />
                    </div>

                    <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black">
                      Trisha AI
                    </h3>

                    <p className="text-sm text-green-300">
                      Online & Learning
                    </p>
                  </div>
                </div>

                <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Mic className="h-5 w-5" />
                </button>
              </div>

              {/* MESSAGES */}
              <div className="mt-6 space-y-5">
                {chats.map((chat, index) => (
                  <motion.div
                    key={index}
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: index * 0.1,
                    }}
                    className={`flex ${
                      chat.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[28px] px-5 py-4 leading-relaxed ${
                        chat.role === "user"
                          ? "bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
                          : "border border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      {chat.message}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* SUGGESTIONS */}
              <div className="mt-6 flex flex-wrap gap-3">
                {suggestions.map((item, index) => (
                  <button
                    key={index}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition-all hover:bg-white/[0.08]"
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* INPUT */}
              <div className="mt-6 flex items-center gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-4">
                <input
                  placeholder="Ask Trisha AI anything..."
                  className="flex-1 bg-transparent outline-none placeholder:text-white/35"
                />

                <button className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Mic className="h-5 w-5" />
                </button>

                <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* BOTTOM CARDS */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Brain,
              value: "98%",
              label: "AI Accuracy",
            },
            {
              icon: MessageCircle,
              value: "24M+",
              label: "AI Replies Generated",
            },
            {
              icon: Zap,
              value: "12ms",
              label: "Realtime Response",
            },
            {
              icon: Sparkles,
              value: "Premium",
              label: "AI Tier",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{
                y: -5,
              }}
              className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-3xl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600/30 to-cyan-500/30">
                <item.icon className="h-7 w-7" />
              </div>

              <h3 className="mt-6 text-5xl font-black">
                {item.value}
              </h3>

              <p className="mt-3 text-white/45">
                {item.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
      <FlexDock />
    </main>
  );
}