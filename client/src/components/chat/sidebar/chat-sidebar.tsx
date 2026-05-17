"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  LogOut,
  MessageCircle,
  Pin,
  Search,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useRouter } from "next/navigation";

import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import StoryTray from "@/components/chat/stories/story-tray";
import { queryClient } from "@/lib/query-client";
import { tokenStorage } from "@/lib/token";
import { useCallStore } from "@/store/call-store";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import { Conversation } from "@/types/conversation";

function hasOnlinePeer(
  conversation: Conversation,
  onlineUsers: ReadonlySet<string>,
  currentUserId?: string
) {
  return (
    conversation.memberIds?.some(
      (memberId) =>
        memberId !== currentUserId &&
        onlineUsers.has(memberId)
    ) ?? false
  );
}

const RELATIVE_TIME_FORMATTER =
  new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

function formatConversationTime(
  value?: string
) {
  if (!value) {
    return "";
  }

  const time =
    new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "";
  }

  const diffSeconds =
    Math.round(
      (time - Date.now()) / 1000
    );
  const absoluteSeconds =
    Math.abs(diffSeconds);

  if (absoluteSeconds < 60) {
    return "now";
  }

  const units = [
    [
      "year",
      60 * 60 * 24 * 365,
    ],
    [
      "month",
      60 * 60 * 24 * 30,
    ],
    [
      "week",
      60 * 60 * 24 * 7,
    ],
    [
      "day",
      60 * 60 * 24,
    ],
    [
      "hour",
      60 * 60,
    ],
    [
      "minute",
      60,
    ],
  ] as const;

  const [
    unit,
    seconds,
  ] =
    units.find(
      ([, unitSeconds]) =>
        absoluteSeconds >=
        unitSeconds
    ) ?? [
      "minute",
      60,
    ];

  return RELATIVE_TIME_FORMATTER.format(
    Math.round(
      diffSeconds / seconds
    ),
    unit
  );
}

type ConversationListButtonProps = {
  conversation: Conversation;
  active: boolean;
  isOnline: boolean;
  onSelect: (
    conversation: Conversation
  ) => void;
};

const ConversationListButton = memo(
  function ConversationListButton({
    conversation,
    active,
    isOnline,
    onSelect,
  }: ConversationListButtonProps) {
    return (
      <button
        type="button"
        onClick={() =>
          onSelect(conversation)
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
              {formatConversationTime(
                conversation.lastActivityAt ??
                  conversation.createdAt
              )}
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
);

export default function ChatSidebar() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] =
    useState("all");
  const [
    logoutConfirmOpen,
    setLogoutConfirmOpen,
  ] = useState(false);
  const deferredSearch =
    useDeferredValue(search);

  const conversationsQuery =
    useConversationsQuery();
  const conversationPatches =
    useConversationStore(
      (state) => state.conversationPatches
    );
  const activeConversationId =
    useConversationStore(
      (state) => state.activeConversationId
    );
  const setActiveConversation = useConversationStore(
    (state) => state.setActiveConversation
  );
  const resetConversationState =
    useConversationStore(
      (state) =>
        state.resetConversationState
    );
  const onlineUsers = useSocketStore(
    (state) => state.onlineUsers
  );
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers),
    [onlineUsers]
  );
  const disconnectSocket =
    useSocketStore(
      (state) =>
        state.disconnectSocket
    );
  const currentUserId = useAuthStore(
    (state) => state.user?.id
  );
  const logout = useAuthStore(
    (state) => state.logout
  );

  const conversations = useMemo(
    () =>
      (conversationsQuery.data ?? []).map(
        (conversation) => {
          const patch =
            conversationPatches[
              conversation.id
            ];

          return patch
            ? {
                ...conversation,
                ...patch,
              }
            : conversation;
        }
      ),
    [
      conversationsQuery.data,
      conversationPatches,
    ]
  );

  const activeConversation =
    conversations.find(
      (conversation) =>
        conversation.id === activeConversationId
    ) ?? null;

  const filteredConversations = useMemo(() => {
    const normalizedSearch =
      deferredSearch.trim().toLowerCase();

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
    deferredSearch,
    activeFolder,
  ]);

  const handleSelectConversation =
    useCallback(
      (conversation: Conversation) => {
        setActiveConversation(conversation);
      },
      [setActiveConversation]
    );

  const confirmLogout =
    useCallback(() => {
      tokenStorage.remove();
      queryClient.clear();
      useCallStore.getState().resetCall();
      resetConversationState();
      disconnectSocket();
      logout();
      router.replace("/auth");
    }, [
      disconnectSocket,
      logout,
      resetConversationState,
      router,
    ]);

  useEffect(() => {
    if (
      !conversations.length ||
      activeConversationId
    ) {
      return;
    }

    setActiveConversation(
      conversations[0]
    );
  }, [
    activeConversationId,
    conversations,
    setActiveConversation,
  ]);

  return (
    <aside className="flex h-full w-full border-r border-white/10 bg-[#08111f]/88 shadow-2xl shadow-black/25 backdrop-blur-3xl lg:w-[360px]">
      <div className="flex w-full flex-col">
        <div className="border-b border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-600/30">
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setLogoutConfirmOpen(true)
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
                aria-label="Logout"
              >
                <LogOut size={19} />
              </button>
            </div>
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
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] pl-12 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple-500/40 focus:bg-white/[0.07]"
            />
          </div>

          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
            {[
              "all",
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

          <StoryTray />
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {conversationsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-[88px] animate-pulse rounded-3xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : null}

          {conversationsQuery.isError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Unable to load conversations
            </div>
          ) : null}

          {filteredConversations.map(
            (conversation) => {
              const active =
                activeConversation?.id ===
                conversation.id;
              const isOnline =
                hasOnlinePeer(
                  conversation,
                  onlineUserIds,
                  currentUserId
                );

              return (
                <ConversationListButton
                  key={conversation.id}
                  conversation={conversation}
                  active={active}
                  isOnline={isOnline}
                  onSelect={
                    handleSelectConversation
                  }
                />
              );
            }
          )}

          {conversationsQuery.hasNextPage ? (
            <button
              type="button"
              onClick={() => {
                void conversationsQuery.fetchNextPage();
              }}
              disabled={
                conversationsQuery.isFetchingNextPage
              }
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-purple-400/30 hover:bg-purple-500/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              {conversationsQuery.isFetchingNextPage
                ? "Loading..."
                : "Load more"}
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {logoutConfirmOpen ? (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[280] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 18,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 18,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 28,
              }}
              className="w-full max-w-sm rounded-[30px] border border-white/10 bg-[#0B111C]/96 p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/15 text-red-100">
                  <AlertTriangle size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    Log out?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    Your session will end on this device. Realtime sync resumes after you sign in again.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setLogoutConfirmOpen(false)
                  }
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogout}
                  className="h-12 rounded-2xl bg-red-500 text-sm font-semibold text-white shadow-xl shadow-red-500/25 transition hover:bg-red-400"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
