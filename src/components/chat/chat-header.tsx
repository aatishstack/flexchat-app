"use client";

import {
  Phone,
  Video,
  MoreVertical,
  Pin,
} from "lucide-react";

export default function ChatHeader() {
  return (
    <>
      <header className="h-24 border-b border-white/10 bg-black/10 backdrop-blur-3xl px-8 flex items-center justify-between">

        <div className="flex items-center gap-4">

          <div className="relative">

            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xl font-bold premium-shadow">
              M
            </div>

            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-400 border-2 border-black"></div>
          </div>

          <div>
            <h2 className="text-lg font-bold">
              Mayuri
            </h2>

            <p className="text-sm text-green-400">
              Online • typing...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">

          {[Pin, Phone, Video, MoreVertical].map(
            (Icon, i) => (
              <button
                key={i}
                className="glass h-12 w-12 rounded-2xl flex items-center justify-center"
              >
                <Icon size={20} />
              </button>
            )
          )}
        </div>
      </header>

      <div className="px-8 pt-5">

        <div className="glass rounded-[32px] px-5 py-4 flex items-center gap-3">

          <Pin
            size={16}
            className="text-violet-400"
          />

          <p className="text-sm text-zinc-300">
            FlexChat premium mode enabled ✨
          </p>
        </div>
      </div>
    </>
  );
}