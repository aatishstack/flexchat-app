"use client";

import { motion } from "framer-motion";

const folders = [
  {
    name: "All",
    count: 24,
    active: true,
  },
  {
    name: "Work",
    count: 8,
    active: false,
  },
  {
    name: "AI",
    count: 3,
    active: false,
  },
  {
    name: "Private",
    count: 12,
    active: false,
  },
];

export default function ChatFolders() {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3">
        {folders.map((folder, index) => (
          <motion.button
            key={index}
            whileTap={{
              scale: 0.96,
            }}
            whileHover={{
              scale: 1.02,
            }}
            className={`flex items-center gap-3 rounded-2xl border px-5 py-3 transition-all ${
              folder.active
                ? "border-cyan-400/30 bg-cyan-400/10"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <span className="font-medium">
              {folder.name}
            </span>

            <div
              className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-black ${
                folder.active
                  ? "bg-cyan-400 text-black"
                  : "bg-white/10 text-white"
              }`}
            >
              {folder.count}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}