"use client";

import { useState } from "react";

import {
  SendHorizonal,
  ImageIcon,
  Mic,
} from "lucide-react";

import StoriesRow from "./stories-row";

export default function ChatConversation() {
  const [text, setText] =
    useState("");

  const messages = [
    {
      id: 1,
      text:
        "Welcome to FlexChat",
      mine: false,
    },

    {
      id: 2,
      text:
        "Premium realtime messaging UI working.",
      mine: true,
    },
  ];

  return (
    <section className="flex h-screen flex-col bg-[#070B14]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-lg font-bold text-white">
            F
          </div>

          <div>
            <h2 className="font-semibold text-white">
              FlexChat
            </h2>

            <p className="text-sm text-green-400">
              Online
            </p>
          </div>
        </div>
      </div>

      <StoriesRow />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.map(
          (
            message
          ) => (
            <div
              key={
                message.id
              }
              className={`mb-4 flex ${
                message.mine
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-3xl px-5 py-4 text-sm text-white shadow-lg ${
                  message.mine
                    ? "bg-gradient-to-br from-purple-600 to-fuchsia-600"
                    : "border border-white/10 bg-white/[0.03]"
                }`}
              >
                {
                  message.text
                }
              </div>
            </div>
          )
        )}
      </div>

      <div className="border-t border-white/10 p-5 backdrop-blur-xl">
        <div className="flex items-end gap-3">
          <button className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:bg-white/[0.06]">
            <ImageIcon
              size={22}
              className="text-zinc-400"
            />
          </button>

          <div className="flex-1 rounded-3xl border border-white/10 bg-white/[0.03] px-5">
            <textarea
              rows={1}
              value={text}
              onChange={(e) =>
                setText(
                  e.target.value
                )
              }
              placeholder="Write a message..."
              className="min-h-[56px] w-full resize-none bg-transparent py-4 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <button className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:bg-white/[0.06]">
            <Mic
              size={22}
              className="text-zinc-400"
            />
          </button>

          <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-2xl shadow-purple-600/30 transition-all hover:scale-105">
            <SendHorizonal
              size={22}
            />
          </button>
        </div>
      </div>
    </section>
  );
}