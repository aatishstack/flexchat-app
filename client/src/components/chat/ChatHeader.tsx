"use client";

import {
  Phone,
  ShieldCheck,
  Video,
  Wifi,
} from "lucide-react";

import { motion } from "framer-motion";

import FlexDock from "@/components/chat/FlexDock";

import { useSocketStore } from "@/store/socket-store";

interface Props {
  userId: string;
  username?: string;
  avatar?: string;
}

export default function ChatHeader({
  userId,
  username = "Mayuri",
  avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400",
}: Props) {

  const typingUsers =
    useSocketStore(
      (s) => s.typingUsers
    );

  const onlineUsers =
    useSocketStore(
      (s) => s.onlineUsers
    );

  const isTyping =
    typingUsers[userId];

  const isOnline =
    onlineUsers[userId]
      ?.status === "online";

  return (

    <div className="relative border-b border-white/10 bg-black/20 px-6 py-4 backdrop-blur-3xl">

      <div className="relative flex items-center justify-between">

        {/* LEFT */}

        <div className="flex items-center gap-4">

          <div className="relative">

            <img
              src={avatar}
              alt={username}
              className="h-14 w-14 rounded-full object-cover"
            />

            <motion.div
              animate={{
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#04040a] ${
                isOnline
                  ? "bg-green-500"
                  : "bg-zinc-500"
              }`}
            />

            {isOnline && (

              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 animate-ping opacity-40" />

            )}

          </div>

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-2xl font-bold">

                {username}

              </h1>

              <ShieldCheck
                size={16}
                className="text-cyan-400"
              />

            </div>

            <div className="mt-1 flex items-center gap-2">

              <Wifi
                size={14}
                className={`${
                  isTyping
                    ? "text-cyan-400"
                    : isOnline
                    ? "text-green-400"
                    : "text-zinc-500"
                }`}
              />

              <p
                className={`text-sm ${
                  isTyping
                    ? "text-cyan-400"
                    : isOnline
                    ? "text-green-400"
                    : "text-zinc-500"
                }`}
              >

                {isTyping
                  ? "typing..."
                  : isOnline
                  ? "Realtime Connected"
                  : "Offline"}

              </p>

            </div>

          </div>

        </div>

        {/* CENTER */}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">

          <FlexDock
            setShowProfile={
              () => {}
            }
            setShowSettings={
              () => {}
            }
            handleLogout={
              () => {}
            }
          />

        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-3">

          <button className="rounded-2xl bg-white/[0.05] p-4 transition hover:bg-white/[0.08]">

            <Phone size={18} />

          </button>

          <button className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 shadow-2xl shadow-violet-700/30 transition hover:scale-[1.03]">

            <Video size={18} />

          </button>

        </div>

      </div>

    </div>
  );
}