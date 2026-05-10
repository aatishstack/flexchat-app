"use client";

import { useState } from "react";

import { motion } from "framer-motion";

import {
  Smile,
  Paperclip,
  Image,
  Mic,
  Send,
} from "lucide-react";

import { socket } from "@/services/socket";

import { useChatStore } from "@/store/chat-store";

export default function ChatInput() {

  const [message, setMessage] =
    useState("");

  const userId =
    useChatStore(
      (state) => state.userId
    );

  const selectedChat =
    useChatStore(
      (state) => state.selectedChat
    );

  const handleSendMessage = () => {

    if (!message.trim()) return;

    socket.emit(
      "send-message",
      {
        id: Date.now(),

        text: message,

        userId,

        chatId:
          selectedChat,
      }
    );

    socket.emit(
      "typing-stop",
      {
        chatId:
          selectedChat,

        userId,
      }
    );

    setMessage("");
  };

  return (
    <div className="border-t border-white/10 bg-black/10 backdrop-blur-3xl p-6">

      <div className="glass rounded-[48px] px-5 py-4 flex items-center gap-4">

        <button>
          <Smile
            size={22}
            className="text-zinc-400"
          />
        </button>

        <button>
          <Paperclip
            size={20}
            className="text-zinc-400"
          />
        </button>

        <button>
          <Image
            size={20}
            className="text-zinc-400"
          />
        </button>

        <input
          value={message}

          onChange={(e) => {

            const value =
              e.target.value;

            setMessage(value);

            if (
              value.trim()
            ) {

              socket.emit(
                "typing-start",
                {
                  chatId:
                    selectedChat,

                  userId,
                }
              );

            } else {

              socket.emit(
                "typing-stop",
                {
                  chatId:
                    selectedChat,

                  userId,
                }
              );
            }
          }}

          onKeyDown={(e) => {

            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}

          placeholder="Write a message..."

          className="flex-1 bg-transparent outline-none text-sm"
        />

        <button>
          <Mic
            size={20}
            className="text-zinc-400"
          />
        </button>

        <motion.button
          whileTap={{
            scale: 0.9,
          }}

          whileHover={{
            scale: 1.05,
          }}

          onClick={
            handleSendMessage
          }

          className="h-12 w-12 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center premium-shadow"
        >
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  );
}