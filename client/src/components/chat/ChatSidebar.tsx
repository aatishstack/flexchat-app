"use client";

import { motion } from "framer-motion";

const chats = [
  {
    name: "Mayuri",
    message: "Realtime HD calls 😭🔥",
    unread: 2,
    online: true,
  },
  {
    name: "Flex AI",
    message: "Generated smart summary",
    unread: 0,
    online: true,
  },
  {
    name: "Realtime Team",
    message: "Deploy completed",
    unread: 8,
    online: false,
  },
  {
    name: "Creators Hub",
    message: "New design system",
    unread: 1,
    online: true,
  },
];

export default function ChatSidebar() {
  return (
    <div className="hidden h-screen w-[360px] flex-col border-r border-white/10 bg-black/20 backdrop-blur-3xl xl:flex">
      {/* HEADER */}
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-cyan-300">
              FLEXCHAT
            </p>

            <h1 className="mt-1 text-4xl font-black">
              Messages
            </h1>
          </div>

          <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            ✨
          </button>
        </div>

        {/* SEARCH */}
        <div className="mt-6">
          <input
            placeholder="Search chats..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none placeholder:text-white/35"
          />
        </div>
      </div>

      {/* CHAT LIST */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chats.map((chat, index) => (
          <motion.button
            key={index}
            whileHover={{
              scale: 1.01,
              x: 4,
            }}
            whileTap={{
              scale: 0.98,
            }}
            className={`relative flex w-full items-center gap-4 overflow-hidden rounded-[28px] border p-4 text-left transition-all ${
              index === 0
                ? "border-cyan-400/20 bg-cyan-400/10"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            {/* AVATAR */}
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-xl font-black">
                {chat.name.charAt(0)}
              </div>

              {chat.online && (
                <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#050816] bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.9)]" />
              )}
            </div>

            {/* INFO */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="truncate font-black">
                  {chat.name}
                </h2>

                <p className="text-xs text-white/40">
                  2m
                </p>
              </div>

              <p className="mt-1 truncate text-sm text-white/50">
                {chat.message}
              </p>
            </div>

            {/* UNREAD */}
            {chat.unread > 0 && (
              <div className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-cyan-400 px-2 text-xs font-black text-black">
                {chat.unread}
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}