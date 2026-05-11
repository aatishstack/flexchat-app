"use client";

import {
  CheckCheck,
  Phone,
  Video,
  MoreHorizontal,
  Smile,
  Paperclip,
  SendHorizonal,
} from "lucide-react";

import { motion } from "framer-motion";

const chats = [
  {
    name: "Mayuri",
    msg: "The new UI looks insane 🔥",
    time: "2m",
    online: true,
  },
  {
    name: "Aarav",
    msg: "Socket events working now",
    time: "5m",
    online: false,
  },
  {
    name: "Nexus Team",
    msg: "Deploy ready build uploaded",
    time: "12m",
    online: true,
  },
];

export default function ConversationPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative z-20 mt-10 overflow-hidden rounded-[36px] border border-white/10 bg-black/30 shadow-[0_0_60px_rgba(139,92,246,0.15)] backdrop-blur-3xl"
    >
      {/* TOP */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <h3 className="text-xl font-bold text-white">
            Active Conversations
          </h3>

          <p className="text-sm text-white/50">
            Realtime synchronized messaging
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white transition-all hover:scale-105">
            <Phone className="h-5 w-5" />
          </button>

          <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white transition-all hover:scale-105">
            <Video className="h-5 w-5" />
          </button>

          <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white transition-all hover:scale-105">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr]">
        {/* LEFT */}
        <div className="border-r border-white/10">
          {chats.map((chat, index) => (
            <motion.div
              key={index}
              whileHover={{
                scale: 1.01,
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
              className={`group flex cursor-pointer items-center gap-4 border-b border-white/5 px-5 py-5 transition-all ${
                index === 0 && "bg-white/[0.03]"
              }`}
            >
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />

                {chat.online && (
                  <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-black bg-green-400" />
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white">
                    {chat.name}
                  </h4>

                  <span className="text-xs text-white/40">
                    {chat.time}
                  </span>
                </div>

                <p className="mt-1 truncate text-sm text-white/50">
                  {chat.msg}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CHAT AREA */}
        <div className="flex flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-black bg-green-400" />
              </div>

              <div>
                <h3 className="font-semibold text-white">
                  Mayuri
                </h3>

                <p className="text-sm text-green-400">
                  typing...
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-white transition-all hover:scale-105">
                <Phone className="h-5 w-5" />
              </button>

              <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-white transition-all hover:scale-105">
                <Video className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex flex-1 flex-col gap-5 p-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-[70%] rounded-3xl rounded-bl-md bg-white/[0.06] px-5 py-4 text-white backdrop-blur-xl"
            >
              The animations are finally feeling premium now 👀
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="ml-auto max-w-[70%] rounded-3xl rounded-br-md bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-4 text-white shadow-xl shadow-purple-500/20"
            >
              Wait till we add realtime gestures and APK polish 🔥

              <div className="mt-2 flex items-center justify-end gap-2 text-xs text-white/70">
                Seen
                <CheckCheck className="h-4 w-4" />
              </div>
            </motion.div>

            <motion.div
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
              }}
              className="flex w-fit items-center gap-2 rounded-full bg-white/[0.05] px-4 py-3"
            >
              <div className="h-2 w-2 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-white" />
              <div className="h-2 w-2 rounded-full bg-white" />
            </motion.div>
          </div>

          {/* INPUT */}
          <div className="border-t border-white/10 p-5">
            <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-2xl">
              <button className="text-white/60 transition-all hover:scale-110 hover:text-white">
                <Smile className="h-6 w-6" />
              </button>

              <input
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
              />

              <button className="text-white/60 transition-all hover:scale-110 hover:text-white">
                <Paperclip className="h-6 w-6" />
              </button>

              <motion.button
                whileHover={{
                  scale: 1.06,
                }}
                whileTap={{
                  scale: 0.95,
                }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-xl shadow-purple-500/20"
              >
                <SendHorizonal className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}