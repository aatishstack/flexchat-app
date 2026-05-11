"use client";

import {
  Image as ImageIcon,
  Mic,
  Paperclip,
  SendHorizonal,
} from "lucide-react";

type MessageComposerProps = {
  message: string;
  setMessage: (
    value: string
  ) => void;
  sendMessage: () => void;
};

export default function MessageComposer({
  message,
  setMessage,
  sendMessage,
}: MessageComposerProps) {
  return (
    <div className="border-t border-white/10 bg-black/20 p-4 backdrop-blur-3xl md:p-5">
      <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-[34px] border border-white/10 bg-white/[0.04] px-4 py-3">
        <button className="text-zinc-400 hover:text-white">
          <Paperclip size={22} />
        </button>

        <button className="text-zinc-400 hover:text-white">
          <ImageIcon size={22} />
        </button>

        <input
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Send realtime message..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
        />

        <button className="text-zinc-400 hover:text-white">
          <Mic size={22} />
        </button>

        <button
          onClick={sendMessage}
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-3 shadow-2xl shadow-violet-700/30"
        >
          <SendHorizonal size={18} />
        </button>
      </div>
    </div>
  );
}