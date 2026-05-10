"use client";

import {
  Search,
  Moon,
  Bell,
  Sparkles,
} from "lucide-react";

import ChatItem from "./chat-item";

import { useChatStore } from "@/store/chat-store";

export default function Sidebar() {

  const chats =
    useChatStore(
      (state) => state.chats
    );

  const selectedChat =
    useChatStore(
      (state) => state.selectedChat
    );

  const setSelectedChat =
    useChatStore(
      (state) => state.setSelectedChat
    );

  return (
    <aside className="sidebar-glow w-[400px] border-r border-white/10 bg-black/10 backdrop-blur-3xl flex flex-col">

      <div className="h-24 border-b border-white/10 px-5 flex items-center justify-between">

        <div>
          <h1 className="text-[34px] font-black tracking-tight">
            FlexChat
          </h1>

          <p className="text-sm text-zinc-400">
            Premium Messaging
          </p>
        </div>

        <div className="flex items-center gap-2">

          {[Moon, Bell, Sparkles].map(
            (Icon, i) => (
              <button
                key={i}
                className="glass h-11 w-11 rounded-2xl flex items-center justify-center"
              >
                <Icon size={18} />
              </button>
            )
          )}
        </div>
      </div>

      <div className="p-4">

        <div className="glass rounded-[38px] px-4 py-3 flex items-center gap-3">

          <Search
            size={18}
            className="text-zinc-500"
          />

          <input
            placeholder="Search conversations"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-5 space-y-3">

        {chats.map((chat) => (

          <div
            key={chat.id}

            onClick={() =>
              setSelectedChat(
                chat.id
              )
            }
          >
            <ChatItem
              name={chat.name}
              msg="Realtime chat ready 🚀"
              time="now"
              unread={0}
              active={
                selectedChat ===
                chat.id
              }
              online={true}
              avatar={
                chat.name.charAt(0)
              }
            />
          </div>
        ))}
      </div>
    </aside>
  );
}