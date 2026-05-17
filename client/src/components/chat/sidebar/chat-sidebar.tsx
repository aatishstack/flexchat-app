"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MessageCircle,
  Pin,
  Plus,
  Search,
} from "lucide-react";

import { getConversations } from "@/services/conversation.service";
import { useSocketStore } from "@/store/socket-store";
import { useConversationStore } from "@/stores/conversation.store";
import { Conversation } from "@/types/conversation";

export default function ChatSidebar() {
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] =
    useState("all");
  const [loadError, setLoadError] =
    useState<string | null>(null);

  const conversations = useConversationStore(
    (state) => state.conversations
  );
  const setConversations = useConversationStore(
    (state) => state.setConversations
  );
  const activeConversation = useConversationStore(
    (state) => state.activeConversation
  );
  const setActiveConversation = useConversationStore(
    (state) => state.setActiveConversation
  );
  const onlineUsers = useSocketStore(
    (state) => state.onlineUsers
  );

  useEffect(() => {
    async function load() {
      try {
        const data = await getConversations();

        setLoadError(null);

        const upgraded: Conversation[] = data.map(
          (conversation, index) => ({
            ...conversation,
            folder:
              index % 4 === 0
                ? "work"
                : index % 3 === 0
                  ? "friends"
                  : index % 2 === 0
                    ? "groups"
                    : "all",
            pinned:
              index === 0 ||
              index === 2 ||
              conversation.pinned,
          })
        );

        setConversations(upgraded);

        if (
          upgraded.length &&
          !useConversationStore.getState()
            .activeConversation
        ) {
          setActiveConversation(upgraded[0]);
        }
      } catch {
        setLoadError(
          "Unable to load conversations"
        );
      }
    }

    load();
  }, [
    setActiveConversation,
    setConversations,
  ]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return conversations
      .filter((conversation) => {
        if (activeFolder === "all") {
          return true;
        }

        if (activeFolder === "unread") {
          return !!conversation.unreadCount;
        }

        return (
          conversation.folder === activeFolder
        );
      })
      .filter((conversation) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          conversation.name
            ?.toLowerCase()
            .includes(normalizedSearch) ??
          false
        );
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) {
          return -1;
        }

        if (!a.pinned && b.pinned) {
          return 1;
        }

        return 0;
      });
  }, [
    conversations,
    search,
    activeFolder,
  ]);

  return (
    <aside className="hidden w-[340px] border-r border-white/10 bg-[#0B111C] lg:flex">
      <div className="flex w-full flex-col">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 shadow-lg shadow-purple-600/30">
                <MessageCircle
                  size={24}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-white">
                  FlexChat
                </h1>

                <p className="text-sm text-zinc-400">
                  Premium Messaging
                </p>
              </div>
            </div>

            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition-all hover:border-purple-500/40 hover:bg-purple-500/10"
            >
              <Plus
                size={20}
                className="text-white"
              />
            </button>
          </div>

          <div className="relative mt-5">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search conversations..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple-500/40"
            />
          </div>

          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
            {[
              "all",
              "work",
              "friends",
              "groups",
              "unread",
            ].map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() =>
                  setActiveFolder(folder)
                }
                className={`rounded-2xl px-4 py-2 text-sm font-medium capitalize transition-all ${
                  activeFolder === folder
                    ? "bg-purple-600 text-white"
                    : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]"
                }`}
              >
                {folder}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {loadError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {loadError}
            </div>
          ) : null}

          {filteredConversations.map(
            (conversation) => {
              const active =
                activeConversation?.id ===
                conversation.id;
              const isOnline =
                onlineUsers.includes(
                  conversation.id
                );

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    setActiveConversation(
                      conversation
                    )
                  }
                  className={`group flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-all ${
                    active
                      ? "border-purple-500/30 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                      : "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-lg font-bold text-white">
                      {conversation.name?.charAt(0) ||
                        "F"}
                    </div>

                    {isOnline ? (
                      <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0B111C] bg-green-500" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate font-semibold text-white">
                          {conversation.name ||
                            "Untitled"}
                        </h3>

                        {conversation.pinned ? (
                          <Pin
                            size={13}
                            className="shrink-0 text-purple-300"
                          />
                        ) : null}
                      </div>

                      <span className="text-xs text-zinc-500">
                        now
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="truncate text-sm text-zinc-400">
                        {conversation.latestMessage ||
                          "Start chatting..."}
                      </p>

                      {conversation.unreadCount ? (
                        <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
                          {conversation.unreadCount}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>
    </aside>
  );
}
