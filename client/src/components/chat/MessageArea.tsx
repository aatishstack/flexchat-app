"use client";


import {
  CheckCheck,
  Mic,
  Smile,
  Paperclip,
  Send,
  Phone,
  Video,
  MoreVertical,
} from "lucide-react";

import { motion } from "framer-motion";


const messages = [
  {
    sender: "other",
    text: "Hey 👋",
    time: "2:45 PM",
  },
  {
    sender: "me",
    text: "Hello! 💜",
    time: "2:46 PM",
  },
  {
    sender: "other",
    text: "How are you?",
    time: "2:47 PM",
  },
  {
    sender: "me",
    text: "Working on FlexChat 😈🔥",
    time: "2:48 PM",
  },
];

export default function MessageArea() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* TOPBAR */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-6 py-5 backdrop-blur-3xl">
        {/* USER */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-xl font-black shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              M
            </div>

            <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              Mayuri
            </h2>

            <p className="text-sm text-green-300">
              typing...
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3">
          <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Phone className="h-5 w-5 text-white" />
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Video className="h-5 w-5 text-white" />
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <MoreVertical className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 space-y-6 overflow-y-auto bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070')] bg-cover bg-center px-6 py-8">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: index * 0.08,
            }}
            className={`flex ${
              message.sender === "me"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[340px] rounded-[28px] px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)] ${
                message.sender === "me"
                  ? "rounded-br-md bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                  : "rounded-bl-md border border-white/10 bg-black/40 text-white backdrop-blur-3xl"
              }`}
            >
              <p className="leading-relaxed">
                {message.text}
              </p>

              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-white/70">
                <span>{message.time}</span>

                {message.sender === "me" && (
                  <CheckCheck className="h-4 w-4 text-cyan-200" />
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* VOICE NOTE */}
        <motion.div
          whileHover={{
            scale: 1.01,
          }}
          className="ml-auto flex max-w-[320px] items-center gap-4 rounded-[28px] rounded-br-md bg-gradient-to-r from-pink-500 to-orange-500 px-5 py-4 shadow-[0_10px_40px_rgba(236,72,153,0.35)]"
        >
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Mic className="h-5 w-5 text-white" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-1">
              {[...Array(18)].map((_, index) => (
                <div
                  key={index}
                  className="w-1 rounded-full bg-white"
                  style={{
                    height: `${8 + (index % 5) * 5}px`,
                  }}
                />
              ))}
            </div>

            <p className="mt-2 text-xs text-white/80">
              0:12 Voice message
            </p>
          </div>
        </motion.div>
      </div>

      {/* INPUT */}
      <div className="border-t border-white/10 bg-black/20 p-5 backdrop-blur-3xl">
        <div className="flex items-center gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] px-5 py-4">
          <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Smile className="h-5 w-5 text-white/70" />
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Paperclip className="h-5 w-5 text-white/70" />
          </button>

          <input
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white outline-none placeholder:text-white/35"
          />

          <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Mic className="h-5 w-5 text-white/70" />
          </button>

          <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}