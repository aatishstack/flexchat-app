"use client";

import {
  MessageCircle,
  Users,
  Bell,
  Settings,
  Sparkles,
  Phone,
} from "lucide-react";

import { motion } from "framer-motion";

const items = [
  { icon: MessageCircle, label: "Chats" },
  { icon: Users, label: "Friends" },
  { icon: Bell, label: "Notifications" },
  { icon: Phone, label: "Calls" },
  { icon: Sparkles, label: "Premium" },
  { icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <motion.div
      initial={{
        x: -80,
        opacity: 0,
      }}
      animate={{
        x: 0,
        opacity: 1,
      }}
      transition={{
        duration: 0.7,
      }}
      className="group relative hidden w-[92px] flex-col justify-between border-r border-white/10 bg-black/20 backdrop-blur-3xl lg:flex"
    >
      {/* SIDE GLOW */}
      <div className="absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-purple-500/50 to-transparent" />

      {/* TOP */}
      <div>
        {/* LOGO */}
        <div className="flex h-24 items-center justify-center">
          <motion.div
            whileHover={{
              rotate: 8,
              scale: 1.08,
            }}
            className="relative flex h-16 w-16 items-center justify-center rounded-[28px] bg-gradient-to-br from-purple-600 via-violet-500 to-blue-500 shadow-[0_10px_50px_rgba(139,92,246,0.45)]"
          >
            {/* GLOW */}
            <div className="absolute inset-0 rounded-[28px] bg-white/10" />

            <MessageCircle className="relative z-10 h-8 w-8 text-white" />
          </motion.div>
        </div>

        {/* NAV */}
        <div className="mt-8 flex flex-col items-center gap-5">
          {items.map((item, index) => (
            <motion.button
              key={index}
              whileHover={{
                scale: 1.12,
                y: -4,
              }}
              whileTap={{
                scale: 0.95,
              }}
              className="group/item relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl"
            >
              {/* ACTIVE LIGHT */}
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/item:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20" />
              </div>

              {/* ICON */}
              <item.icon className="relative z-10 h-6 w-6 text-white/70 transition-all duration-300 group-hover/item:text-white" />

              {/* FLOATING TOOLTIP */}
              <div className="pointer-events-none absolute left-24 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm font-medium text-white opacity-0 shadow-2xl backdrop-blur-2xl transition-all duration-300 group-hover/item:translate-x-2 group-hover/item:opacity-100">
                {item.label}
              </div>

              {/* ACTIVE BAR */}
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-purple-400 to-blue-400 opacity-0 group-hover/item:opacity-100"
              />
            </motion.button>
          ))}
        </div>
      </div>

      {/* BOTTOM PROFILE */}
      <div className="mb-6 flex justify-center">
        <motion.div
          whileHover={{
            scale: 1.08,
            rotate: 4,
          }}
          className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-purple-500/40 p-[2px] shadow-[0_0_30px_rgba(139,92,246,0.35)]"
        >
          <div className="h-full w-full rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900" />

          {/* ONLINE */}
          <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-black bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.9)]" />
        </motion.div>
      </div>
    </motion.div>
  );
}