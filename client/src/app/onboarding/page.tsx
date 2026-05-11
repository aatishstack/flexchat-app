"use client";

import {
  Camera,
  ArrowRight,
  Sparkles,
  Palette,
  User2,
} from "lucide-react";

import { motion } from "framer-motion";

const themes = [
  {
    name: "Nebula",
    gradient: "from-purple-500 to-blue-500",
  },
  {
    name: "Aurora",
    gradient: "from-cyan-500 to-emerald-500",
  },
  {
    name: "Sunset",
    gradient: "from-orange-500 to-pink-500",
  },
  {
    name: "Midnight",
    gradient: "from-slate-700 to-slate-900",
  },
];

export default function OnboardingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-6 py-10 text-white">
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

      {/* CARD */}
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
          duration: 0.6,
        }}
        className="relative z-10 w-full max-w-2xl rounded-[40px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-3xl"
      >
        {/* TOP */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[28px] bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_10px_50px_rgba(139,92,246,0.45)]">
            <Sparkles className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-4xl font-black">
              Complete Your Profile
            </h1>

            <p className="mt-2 text-white/45">
              Personalize your FlexChat identity
            </p>
          </div>
        </div>

        {/* AVATAR */}
        <div className="mt-10 flex flex-col items-center">
          <motion.button
            whileHover={{
              scale: 1.04,
            }}
            whileTap={{
              scale: 0.96,
            }}
            className="group relative"
          >
            {/* RINGS */}
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20 blur-xl" />

            {/* AVATAR */}
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_20px_80px_rgba(139,92,246,0.45)]">
              <User2 className="h-20 w-20 text-white" />

              {/* CAMERA */}
              <div className="absolute bottom-2 right-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl">
                <Camera className="h-6 w-6" />
              </div>
            </div>
          </motion.button>

          <p className="mt-5 text-sm text-white/45">
            Upload profile picture
          </p>
        </div>

        {/* FORM */}
        <div className="mt-10 grid gap-6">
          {/* DISPLAY NAME */}
          <div>
            <label className="mb-3 block text-sm text-white/45">
              Display Name
            </label>

            <input
              placeholder="Mayuri"
              className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 outline-none transition-all focus:border-purple-500/40 focus:bg-white/[0.06]"
            />
          </div>

          {/* USERNAME */}
          <div>
            <label className="mb-3 block text-sm text-white/45">
              Username
            </label>

            <input
              placeholder="@mayuri"
              className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 outline-none transition-all focus:border-purple-500/40 focus:bg-white/[0.06]"
            />
          </div>

          {/* BIO */}
          <div>
            <label className="mb-3 block text-sm text-white/45">
              Bio
            </label>

            <textarea
              rows={4}
              placeholder="Designing futuristic experiences ✨"
              className="w-full resize-none rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 outline-none transition-all focus:border-purple-500/40 focus:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* THEMES */}
        <div className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <Palette className="h-5 w-5 text-cyan-300" />

            <h2 className="text-xl font-bold">
              Choose Theme
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {themes.map((theme, index) => (
              <motion.button
                key={index}
                whileHover={{
                  y: -6,
                }}
                whileTap={{
                  scale: 0.96,
                }}
                className="group"
              >
                <div
                  className={`relative h-28 rounded-[28px] border border-white/10 bg-gradient-to-br ${theme.gradient} shadow-2xl transition-all duration-300 group-hover:shadow-[0_20px_60px_rgba(139,92,246,0.35)]`}
                >
                  {/* ACTIVE */}
                  {index === 0 && (
                    <div className="absolute inset-0 rounded-[28px] border-2 border-white/70" />
                  )}
                </div>

                <p className="mt-3 text-sm text-white/60">
                  {theme.name}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* CONTINUE */}
        <motion.button
          whileHover={{
            scale: 1.02,
          }}
          whileTap={{
            scale: 0.98,
          }}
          className="mt-10 flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 py-5 text-lg font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
        >
          Continue to FlexChat

          <ArrowRight className="h-5 w-5" />
        </motion.button>
      </motion.div>
    </main>
  );
}