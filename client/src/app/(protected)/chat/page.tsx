"use client";

import {
  useEffect,
  useState,
} from "react";

import ChatShell from "../../../components/chat/chat-shell";

import ChatSidebar from "../../../components/chat/sidebar/chat-sidebar";

import ChatConversation from "../../../components/chat/conversation/chat-conversation";

import NotificationPanel from "../../../components/chat/sidebar/notification-panel";

import GlobalSearch from "../../../components/chat/sidebar/global-search";

import { useGlobalSearchStore } from "../../../store/global-search-store";

export default function ChatPage() {
  const [aiOpen, setAiOpen] =
    useState(true);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const setGlobalSearchOpen =
    useGlobalSearchStore(
      (state) =>
        state.setOpen
    );

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        (
          event.ctrlKey ||
          event.metaKey
        ) &&
        event.key === "j"
      ) {
        event.preventDefault();

        setGlobalSearchOpen(
          true
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    setGlobalSearchOpen,
  ]);

  return (
    <div className="relative h-screen overflow-hidden bg-[#070B14]">
      <GlobalSearch />

      <ChatShell
        sidebar={<ChatSidebar />}
        chat={<ChatConversation />}
      />

      {notificationsOpen && (
        <aside className="absolute right-0 top-0 z-40 hidden h-full w-[380px] border-l border-white/10 bg-[#0B111C] xl:flex">
          <NotificationPanel />
        </aside>
      )}

      {aiOpen && (
        <aside className="absolute right-0 top-0 z-30 hidden h-full w-[380px] border-l border-white/10 bg-[#0B111C] xl:flex">
          <div className="flex h-full w-full flex-col">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-xl text-white">
                  ✨
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    Flex AI
                  </h2>

                  <p className="text-sm text-zinc-400">
                    Smart assistant
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-zinc-300">
                  Ask Flex AI to summarize chats,
                  search files, generate replies,
                  or manage conversations.
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
                <input
                  placeholder="Ask Flex AI..."
                  className="h-14 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
                />

                <button className="text-xl text-white">
                  ✨
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 xl:right-[400px]">
        <button
          onClick={() =>
            setNotificationsOpen(
              (
                prev
              ) => !prev
            )
          }
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#111827] text-2xl text-white shadow-2xl transition-all hover:scale-105"
        >
          🔔
        </button>

        <button
          onClick={() =>
            setAiOpen(
              (
                prev
              ) => !prev
            )
          }
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-2xl text-white shadow-2xl shadow-purple-600/30 transition-all hover:scale-105"
        >
          ✨
        </button>
      </div>
    </div>
  );
}