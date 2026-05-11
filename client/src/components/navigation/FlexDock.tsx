"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import {
  MessageCircle,
  Phone,
  Bell,
  Users,
  Sparkles,
  Shield,
  User,
  Bot,
} from "lucide-react";

import { motion } from "framer-motion";

const items = [
  {
    icon: MessageCircle,
    href: "/chat",
    label: "Chat",
  },
  {
    icon: Phone,
    href: "/calls",
    label: "Calls",
  },
  {
    icon: Bell,
    href: "/notifications",
    label: "Alerts",
  },
  {
    icon: Users,
    href: "/friends",
    label: "Friends",
  },
  {
    icon: Sparkles,
    href: "/status",
    label: "Status",
  },
  {
    icon: Bot,
    href: "/ai",
    label: "AI",
  },
  {
    icon: User,
    href: "/profile",
    label: "Profile",
  },
  {
    icon: Shield,
    href: "/admin",
    label: "Admin",
  },
];

export default function FlexDock() {
  const pathname = usePathname();

  return (
    <>
      {/* DESKTOP */}
      <div className="fixed bottom-8 left-1/2 z-[999] hidden -translate-x-1/2 xl:block">
        <div className="flex items-center gap-3 rounded-[34px] border border-white/10 bg-black/30 p-3 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-3xl">
          {items.map((item, index) => {
            const active = pathname === item.href;

            return (
              <Link
                key={index}
                href={item.href}
              >
                <motion.div
                  whileHover={{
                    y: -6,
                    scale: 1.05,
                  }}
                  whileTap={{
                    scale: 0.96,
                  }}
                  className={`group relative flex h-16 w-16 items-center justify-center rounded-3xl transition-all ${
                    active
                      ? "bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.45)]"
                      : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                >
                  {/* GLOW */}
                  {active && (
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-500 opacity-40 blur-xl" />
                  )}

                  {/* ICON */}
                  <item.icon className="relative z-10 h-6 w-6" />

                  {/* TOOLTIP */}
                  <div className="pointer-events-none absolute -top-14 rounded-2xl border border-white/10 bg-black/70 px-4 py-2 text-sm opacity-0 backdrop-blur-xl transition-all group-hover:opacity-100">
                    {item.label}
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 z-[999] border-t border-white/10 bg-black/40 px-3 py-4 backdrop-blur-3xl xl:hidden">
        <div className="flex items-center justify-between">
          {items.slice(0, 5).map((item, index) => {
            const active = pathname === item.href;

            return (
              <Link
                key={index}
                href={item.href}
                className="flex-1"
              >
                <motion.div
                  whileTap={{
                    scale: 0.92,
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center rounded-3xl transition-all ${
                      active
                        ? "bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.45)]"
                        : "bg-white/[0.04]"
                    }`}
                  >
                    {active && (
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-500 opacity-30 blur-xl" />
                    )}

                    <item.icon className="relative z-10 h-5 w-5" />
                  </div>

                  <span
                    className={`text-xs ${
                      active
                        ? "text-white"
                        : "text-white/45"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}