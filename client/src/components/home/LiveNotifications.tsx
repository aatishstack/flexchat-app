"use client";

import {
  Bell,
  CheckCheck,
  Heart,
  Sparkles,
} from "lucide-react";

import { motion } from "framer-motion";

const notifications = [
  {
    icon: Heart,
    title: "Mayuri reacted ❤️",
    desc: "Loved your latest message",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Sparkles,
    title: "Premium Activated",
    desc: "Animated emoji status unlocked",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: CheckCheck,
    title: "Realtime Sync Complete",
    desc: "Messages synchronized successfully",
    color: "from-cyan-500 to-blue-500",
  },
];

export default function LiveNotifications() {
  return (
    <div className="pointer-events-none fixed right-6 top-24 z-[100] hidden w-[360px] flex-col gap-4 xl:flex">
      {notifications.map((notification, index) => (
        <motion.div
          key={index}
          initial={{
            opacity: 0,
            x: 100,
            y: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
          }}
          transition={{
            delay: index * 0.2,
            duration: 0.6,
          }}
          whileHover={{
            scale: 1.03,
            y: -4,
          }}
          className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-black/40 p-5 shadow-[0_15px_60px_rgba(139,92,246,0.18)] backdrop-blur-3xl"
        >
          {/* SHIMMER */}
          <motion.div
            animate={{
              x: ["-150%", "250%"],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-y-0 left-0 w-24 rotate-12 bg-white/[0.06] blur-xl"
          />

          {/* BACKGROUND */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${notification.color} opacity-[0.08]`}
          />

          <div className="relative flex items-start gap-4">
            {/* ICON */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${notification.color} shadow-2xl`}
            >
              <notification.icon className="h-6 w-6 text-white" />
            </motion.div>

            {/* CONTENT */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">
                  {notification.title}
                </h3>

                <Bell className="h-4 w-4 text-white/40" />
              </div>

              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {notification.desc}
              </p>

              {/* LIVE STATUS */}
              <div className="mt-4 flex items-center gap-2">
                <motion.div
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                  className="h-2 w-2 rounded-full bg-green-400"
                />

                <span className="text-xs font-medium tracking-wide text-green-400">
                  LIVE EVENT
                </span>
              </div>
            </div>
          </div>

          {/* GLOW */}
          <div
            className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${notification.color} opacity-20 blur-3xl`}
          />
        </motion.div>
      ))}
    </div>
  );
}