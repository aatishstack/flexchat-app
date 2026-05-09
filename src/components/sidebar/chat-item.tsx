"use client";

import { motion } from "framer-motion";

interface Props {
  name: string;
  msg: string;
  time: string;
  unread: number;
  active: boolean;
  online: boolean;
  avatar: string;
}

export default function ChatItem({
  name,
  msg,
  time,
  unread,
  active,
  online,
  avatar,
}: Props) {
  return (
    <motion.div
      whileHover={{
        scale: 1.02,
      }}
      className={`rounded-[40px] p-4 cursor-pointer transition-all ${
        active
          ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20 premium-shadow"
          : "glass hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-lg">

            {avatar}

            {online && (
              <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-black"></div>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-[15px]">
              {name}
            </h2>

            <p className="text-sm text-zinc-400">
              {msg}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">

          <span className="text-xs text-zinc-500">
            {time}
          </span>

          {unread > 0 && (
            <div className="min-w-[22px] h-[22px] rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center text-xs font-semibold">
              {unread}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}