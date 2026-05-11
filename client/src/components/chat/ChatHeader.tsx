"use client";

import {
  Phone,
  ShieldCheck,
  Video,
  Wifi,
} from "lucide-react";

import { motion } from "framer-motion";

export default function ChatHeader() {
  return (
    <div className="border-b border-white/10 bg-black/20 px-4 py-5 backdrop-blur-3xl md:px-6">
      <div className="flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400"
              className="h-14 w-14 rounded-full object-cover"
            />

            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#04040a] bg-green-500"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black">
                Mayuri
              </h2>

              <ShieldCheck
                size={16}
                className="text-cyan-400"
              />
            </div>

            <div className="mt-1 flex items-center gap-2">
              <Wifi
                size={14}
                className="text-green-400"
              />

              <p className="text-sm text-green-400">
                Realtime Connected
              </p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button className="rounded-2xl bg-white/[0.05] p-4 hover:bg-white/[0.08]">
            <Phone size={18} />
          </button>

          <button className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 shadow-2xl shadow-violet-700/30">
            <Video size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}