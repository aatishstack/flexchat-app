"use client";

import { useEffect, useRef } from "react";

import ChatHeader from "./chat-header";

import ChatInput from "./chat-input";

import MessageBubble from "./message-bubble";

import { useChatStore } from "@/store/chat-store";

export default function ChatLayout() {

  const messages =
    useChatStore(
      (state) => state.messages
    );

  const typingUsers =
    useChatStore(
      (state) => state.typingUsers
    );

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [
    messages,
    typingUsers,
  ]);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">

      <ChatHeader />

      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">

        {messages.map((message) => (

          <MessageBubble
            key={message.id}
            mine={message.mine}
            text={message.text}
            createdAt={
              new Date(
                message.id
              ).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )
            }
          />
        ))}

        {typingUsers.length > 0 && (

          <div className="flex items-center gap-2 text-sm text-zinc-400 animate-pulse">

            <div className="flex gap-1">

              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />

              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />

              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
            </div>

            <span>
              typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput />
    </section>
  );
}