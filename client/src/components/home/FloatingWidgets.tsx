"use client";

import {
  Activity,
  Wifi,
  ShieldCheck,
  Flame,
  Server,
  Cpu,
} from "lucide-react";

import { motion } from "framer-motion";
import TiltCard from "./TiltCard";

const widgets = [
  {
    icon: Activity,
    title: "Realtime Activity",
    value: "99.99%",
    color: "from-green-500 to-emerald-400",
  },
  {
    icon: Wifi,
    title: "Latency",
    value: "12ms",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Secure Sessions",
    value: "Protected",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Flame,
    title: "Live Users",
    value: "2.4M+",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Server,
    title: "Infrastructure",
    value: "Global",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Cpu,
    title: "Realtime Engine",
    value: "Socket.IO",
    color: "from-blue-500 to-cyan-400",
  },
];

export default function FloatingWidgets() {
  return (
    <div className="relative z-30 mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {widgets.map((widget, index) => (
        <TiltCard
          key={index}
          className="group relative isolate overflow-hidden rounded-[34px] border border-white/10 bg-[#0f1117]/90 p-6 shadow-[0_10px_60px_rgba(0,0,0,0.45)] backdrop-blur-3xl"
        >
          {/* HOVER GLOW */}
          <div className="absolute inset-0 opacity-0 transition-all duration-500 group-hover:opacity-100">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${widget.color} opacity-[0.10]`}
            />

            <div className="absolute inset-[1px] rounded-[34px] bg-black/30" />
          </div>

          {/* NOISE */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
          </div>

          {/* TOP */}
          <div className="relative flex items-start justify-between">
            <motion.div
              whileHover={{
                rotate: 6,
                scale: 1.08,
              }}
              className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${widget.color} shadow-[0_10px_40px_rgba(139,92,246,0.35)]`}
            >
              <widget.icon className="h-7 w-7 text-white" />
            </motion.div>

            <motion.div
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]"
            />
          </div>

          {/* CONTENT */}
          <div className="relative mt-7">
            <p className="text-sm font-medium tracking-wide text-white/45">
              {widget.title}
            </p>

            <h3 className="mt-3 text-4xl font-black tracking-tight text-white">
              {widget.value}
            </h3>
          </div>

          {/* MOVING LIGHT */}
          <motion.div
            animate={{
              x: [-200, 500],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            className={`absolute bottom-0 h-[2px] w-32 bg-gradient-to-r ${widget.color}`}
          />

          {/* CORNER GLOW */}
          <div
            className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${widget.color} opacity-20 blur-3xl`}
          />
        </TiltCard>
      ))}
    </div>
  );
}