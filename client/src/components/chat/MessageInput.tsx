"use client";

import {
  SendHorizonal,
  Smile,
  Paperclip,
  Mic,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";

interface Props {
  message: string;
  setMessage: (
    value: string
  ) => void;
  handleSend: () => void;
}

export default function MessageInput({
  message,
  setMessage,
  handleSend,
}: Props) {

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {

    if (
      textareaRef.current
    ) {

      textareaRef.current.style.height =
        "auto";

      textareaRef.current.style.height =
        `${textareaRef.current.scrollHeight}px`;
    }

  }, [message]);

  const handleKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>
  ) => {

    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {

      e.preventDefault();

      handleSend();
    }
  };

  return (

    <div className="border-t border-white/5 bg-[#202c33]/90 px-4 py-3 backdrop-blur-xl">

      <div className="mx-auto flex max-w-[900px] items-end gap-3">

        {/* EMOJI */}

        <button className="rounded-xl p-3 text-white/55 transition hover:bg-white/5 hover:text-white">

          <Smile size={22} />

        </button>

        {/* ATTACH */}

        <button className="rounded-xl p-3 text-white/55 transition hover:bg-white/5 hover:text-white">

          <Paperclip size={22} />

        </button>

        {/* INPUT */}

        <div className="flex-1 rounded-[28px] border border-white/5 bg-[#2a3942] px-4 py-3 transition focus-within:border-purple-500/40 focus-within:shadow-[0_0_25px_rgba(168,85,247,0.18)]">

          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder="Type a message"
            className="max-h-[180px] min-h-[28px] w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />

        </div>

        {/* VOICE */}

        <button className="rounded-xl p-3 text-white/55 transition hover:bg-white/5 hover:text-white">

          <Mic size={22} />

        </button>

        {/* SEND */}

        <motion.button

          whileTap={{
            scale: 0.92,
          }}

          onClick={
            handleSend
          }

          disabled={
            !message.trim()
          }

          className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl transition-all duration-200 ${
            message.trim()
              ? "bg-purple-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:bg-purple-400"
              : "bg-white/5 text-white/30"
          }`}
        >

          <SendHorizonal
            size={20}
          />

        </motion.button>

      </div>

    </div>
  );
}
