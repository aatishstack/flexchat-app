"use client";

import ChatHeader from "./chat-header";

import ChatInput from "./chat-input";

import MessageBubble from "./message-bubble";

import { useChatStore } from "@/store/chat-store";

export default function ChatLayout() {

  const messages =
    useChatStore(
      (state) => state.messages
    );

  return (
    <section className="flex-1 flex flex-col overflow-hidden">

      <ChatHeader />

      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">

        {messages.map((message) => (

          <MessageBubble
            key={message.id}
            mine={message.mine}
            text={message.text}
            createdAt="now"
          />
        ))}
      </div>

      <ChatInput />
    </section>
  );
}