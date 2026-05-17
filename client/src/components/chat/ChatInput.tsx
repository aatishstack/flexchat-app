"use client";

import {
  Smile,
  Paperclip,
  Mic,
  Send,
} from "lucide-react";

import {
  useRef,
  type ChangeEvent,
} from "react";

import { useSocketStore } from "@/store/socket-store";

type ReplyTarget = {
  id: string;
  text: string;
} | null;

interface Props {
  message: string;
  setMessage: (
    value: string
  ) => void;
  handleSend: () => void;
  handleTyping: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  replyingTo: ReplyTarget;
  setReplyingTo: (
    value: ReplyTarget
  ) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (
    value: boolean
  ) => void;
  conversationId: string;
}

export default function ChatInput({
  message,
  setMessage,
  handleSend,
  handleTyping,
  replyingTo,
  setReplyingTo,
  showEmojiPicker,
  setShowEmojiPicker,
  conversationId,
}: Props) {

  const startTyping = useSocketStore(
    (s) => s.startTyping
  );

  const stopTyping = useSocketStore(
    (s) => s.stopTyping
  );

  const typingTimeout =
    useRef<NodeJS.Timeout | null>(
      null
    );

  return (

    <div className="border-t border-white/10 bg-black/20 p-5 backdrop-blur-2xl">

      {/* REPLY BAR */}

      {replyingTo && (

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">

          <div>

            <p className="text-xs font-medium text-cyan-300">

              Replying to

            </p>

            <p className="mt-1 text-sm text-white/70">

              {replyingTo.text}

            </p>

          </div>

          <button
            onClick={() =>
              setReplyingTo(
                null
              )
            }
            className="text-lg text-white/40 transition hover:text-white"
          >

            ✕

          </button>

        </div>
      )}

      {/* INPUT CONTAINER */}

      <div className="flex items-center gap-3 rounded-[32px] border border-cyan-500/10 bg-[#081018]/95 px-4 py-3 shadow-[0_0_40px_rgba(0,255,255,0.06)] backdrop-blur-3xl">

        {/* EMOJI */}

        <button
          onClick={() =>
            setShowEmojiPicker(
              !showEmojiPicker
            )
          }
          className="rounded-2xl p-3 text-white/50 transition hover:bg-white/5 hover:text-cyan-300"
        >

          <Smile size={20} />

        </button>

        {/* INPUT */}

        <input
          value={message}
          onChange={(e) => {

            setMessage(
              e.target.value
            );

            handleTyping(e);

            startTyping(
              conversationId
            );

            if (
              typingTimeout.current
            ) {
              clearTimeout(
                typingTimeout.current
              );
            }

            typingTimeout.current =
              setTimeout(() => {

                stopTyping(
                  conversationId
                );

              }, 1200);
          }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
        />

        {/* RIGHT ACTIONS */}

        <div className="flex items-center gap-2">

          {/* ATTACH */}

          <button
            className="rounded-2xl p-3 text-white/50 transition hover:bg-white/5 hover:text-cyan-300"
          >

            <Paperclip size={18} />

          </button>

          {/* MIC */}

          <button
            className="rounded-2xl p-3 text-white/50 transition hover:bg-white/5 hover:text-cyan-300"
          >

            <Mic size={18} />

          </button>

          {/* SEND */}

          <button
            onClick={
              handleSend
            }
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.03]"
          >

            <Send size={18} />

            Send

          </button>

        </div>

      </div>

    </div>
  );
}
