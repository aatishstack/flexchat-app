"use client";

import { motion } from "framer-motion";
import {
  Search,
  Moon,
  Bell,
  Sparkles,
} from "lucide-react";

import MagneticButton from "./MagneticButton";

export default function TopBar() {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden border-b border-white/10 bg-black/20 px-6 py-5 backdrop-blur-3xl"
    >
      {/* REFLECTION */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

      <div className="relative flex items-center justify-between">
        {/* LEFT */}
        <div>
          <motion.h2
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
            className="text-2xl font-black tracking-tight text-white"
          >
            Welcome to FlexChat
          </motion.h2>

          <p className="mt-1 text-sm text-white/45">
            Premium realtime communication platform
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <MagneticButton className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white backdrop-blur-xl">
            <Search className="h-5 w-5" />
          </MagneticButton>

          <MagneticButton className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white backdrop-blur-xl">
            <Bell className="h-5 w-5" />
          </MagneticButton>

          <MagneticButton className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white backdrop-blur-xl">
            <Sparkles className="h-5 w-5" />
          </MagneticButton>

          <MagneticButton className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white backdrop-blur-xl">
            <Moon className="h-5 w-5" />
          </MagneticButton>
        </div>
      </div>
    </motion.div>
  );
}