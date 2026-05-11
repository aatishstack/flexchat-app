"use client";

import Link from "next/link";

import {
  ArrowLeft,
  Bell,
  Shield,
  Moon,
  Palette,
  Smartphone,
  Lock,
  EyeOff,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";

import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>

            <div>
              <h1 className="text-5xl font-black">
                Settings
              </h1>

              <p className="mt-2 text-white/45">
                Control your FlexChat experience
              </p>
            </div>
          </div>
        </div>

        {/* CARD */}
        <motion.div
          whileHover={{
            y: -4,
          }}
          className="mt-10 rounded-[40px] border border-white/10 bg-white/[0.04] p-6"
        >
          <h2 className="text-3xl font-black">
            Premium Settings
          </h2>

          <p className="mt-3 text-white/45">
            Everything working correctly now 😈🔥
          </p>
        </motion.div>

        {/* LOGOUT */}
        <motion.button
          whileHover={{
            scale: 1.02,
          }}
          whileTap={{
            scale: 0.98,
          }}
          className="mt-12 flex w-full items-center justify-center gap-3 rounded-[32px] border border-red-500/20 bg-red-500/10 py-5 text-lg font-bold text-red-300"
        >
          <LogOut className="h-6 w-6" />

          Logout
        </motion.button>
      </div>
    </main>
  );
}