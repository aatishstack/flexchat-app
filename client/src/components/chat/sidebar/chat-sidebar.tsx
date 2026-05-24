"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Ban,
  BellOff,
  LogOut,
  MessageCircle,
  Pin,
  Search,
  Settings,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import type {
  PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";

import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useServerNow } from "@/hooks/use-server-now";
import StoryTray from "@/components/chat/stories/story-tray";
import FlexAvatar from "@/components/chat/flex-avatar";
import { clearClientSession } from "@/lib/session-cleanup";
import {
  deleteConversation,
} from "@/services/conversation.service";
import {
  removeConversationFromQueryCache,
} from "@/lib/conversation-query-cache";
import type {
  ConversationQueryCache,
} from "@/lib/conversation-query-cache";
import { queryKeys } from "@/lib/query-keys";
import {
  formatDisplayName,
} from "@/lib/user-display";
import { useSocketStore } from "@/store/socket-store";
import { useToastStore } from "@/store/toast-store";
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
  value?: string,
  now = Date.now()
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
      (time - now) / 1000
    );
  const absoluteSeconds =
    Math.abs(diffSeconds);

  if (absoluteSeconds < 60) {
    return "Now";
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

function getConversationAvatar(
  conversation: Conversation,
  currentUserId?: string
) {
  return (
    conversation.avatar ??
    conversation.members?.find(
      (member) =>
        member.id !== currentUserId &&
        member.avatar
    )?.avatar ??
    null
  );
}

type ConversationListButtonProps = {
  conversation: Conversation;
  active: boolean;
  isOnline: boolean;
  currentUserId?: string;
  muted: boolean;
  now: number;
  onSelect: (
    conversation: Conversation
  ) => void;
  onContextOpen: (
    conversation: Conversation
  ) => void;
};

const ConversationListButton = memo(
  function ConversationListButton({
    conversation,
    active,
    isOnline,
    currentUserId,
    muted,
    now,
    onSelect,
    onContextOpen,
  }: ConversationListButtonProps) {
    const longPressTimerRef =
      useRef<ReturnType<typeof setTimeout> | null>(
        null
      );
    const longPressTriggeredRef =
      useRef(false);
    const avatar =
      getConversationAvatar(
        conversation,
        currentUserId
      );

    const clearLongPressTimer =
      useCallback(() => {
        if (!longPressTimerRef.current) {
          return;
        }

        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }, []);

    const handlePointerDown =
      useCallback(
        (
          event: ReactPointerEvent<HTMLButtonElement>
        ) => {
          if (
            event.pointerType === "mouse" &&
            event.button !== 0
          ) {
            return;
          }

          longPressTriggeredRef.current = false;
          clearLongPressTimer();

          longPressTimerRef.current =
            setTimeout(() => {
              longPressTriggeredRef.current = true;
              onContextOpen(conversation);
            }, 430);
        },
        [
          clearLongPressTimer,
          conversation,
          onContextOpen,
        ]
      );

    useEffect(
      () => () => {
        clearLongPressTimer();
      },
      [clearLongPressTimer]
    );

    return (
      <motion.button
        type="button"
        onClick={() => {
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
          }

          onSelect(conversation);
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPressTimer}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        onContextMenu={(event) => {
          event.preventDefault();
          clearLongPressTimer();
          onContextOpen(conversation);
        }}
        whileHover={{
          y: -1,
          scale: 1.01,
        }}
        whileTap={{
          scale: 0.985,
        }}
        className={`group flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-all ${
          active
            ? "border-purple-400/35 bg-purple-500/[0.12] shadow-[0_18px_55px_rgba(147,51,234,0.16)]"
            : "border-transparent bg-white/[0.035] hover:border-white/10 hover:bg-white/[0.055] hover:shadow-[0_16px_45px_rgba(0,0,0,0.18)]"
        }`}
      >
        <div className="relative">
          <FlexAvatar
            src={avatar}
            name={conversation.name}
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-lg font-bold text-white"
          />

          {isOnline ? (
            <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0B111C] bg-green-500" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate font-semibold text-white">
                {formatDisplayName(
                  conversation.name ||
                    "Untitled"
                )}
              </h3>

              {conversation.pinned ? (
                <Pin
                  size={13}
                  className="shrink-0 text-purple-300"
                />
              ) : null}

              {muted ? (
                <BellOff
                  size={13}
                  className="shrink-0 text-zinc-500"
                />
              ) : null}
            </div>

            <span className="text-xs text-zinc-500">
              {formatConversationTime(
                conversation.lastActivityAt ??
                  conversation.createdAt,
                now
              )}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-sm text-zinc-400">
              {conversation.latestMessage ||
                "No messages yet"}
            </p>

            {conversation.unreadCount ? (
              <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
                {conversation.unreadCount}
              </div>
            ) : null}
          </div>
        </div>
      </motion.button>
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
  const [
    actionConversation,
    setActionConversation,
  ] = useState<Conversation | null>(null);
  const [
    clearPendingConversationId,
    setClearPendingConversationId,
  ] = useState<string | null>(null);
  const [
    hiddenConversationIds,
    setHiddenConversationIds,
  ] = useState<Set<string>>(
    () => new Set()
  );
  const [
    mutedConversationIds,
    setMutedConversationIds,
  ] = useState<Set<string>>(
    () => new Set()
  );
  const [
    blockedConversationIds,
    setBlockedConversationIds,
  ] = useState<Set<string>>(
    () => new Set()
  );
  const now = useServerNow();
  const deferredSearch =
    useDeferredValue(search);

  const conversationsQuery =
    useConversationsQuery();
  const queryClient =
    useQueryClient();
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
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
  const onlineUsers = useSocketStore(
    useShallow((state) => state.onlineUsers)
  );
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers),
    [onlineUsers]
  );
  const currentUserId = useAuthStore(
    (state) => state.user?.id
  );

  const patchedConversations = useMemo(
    () =>
      (conversationsQuery.data ?? [])
        .filter(
          (conversation) =>
            !hiddenConversationIds.has(
              conversation.id
            )
        )
        .map((conversation) => {
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
        }),
    [
      conversationsQuery.data,
      conversationPatches,
      hiddenConversationIds,
    ]
  );

  const conversations = useMemo(
    () =>
      patchedConversations.filter((conversation) =>
        activeFolder === "archive"
          ? !!conversation.archivedAt
          : !conversation.archivedAt
      ),
    [
      activeFolder,
      patchedConversations,
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

        if (activeFolder === "archive") {
          return true;
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
        window.dispatchEvent(
          new CustomEvent(
            "flexchat:conversation-selected"
          )
        );
      },
      [setActiveConversation]
    );

  const closeConversationActions =
    useCallback(() => {
      setActionConversation(null);
    }, []);

  const handleClearConversation =
    useCallback(async () => {
      if (!actionConversation) {
        return;
      }

      const conversationId =
        actionConversation.id;

      setClearPendingConversationId(
        conversationId
      );

      setHiddenConversationIds(
        (current) =>
          new Set(current).add(
            conversationId
          )
      );

      if (
        activeConversationId ===
        conversationId
      ) {
        useConversationStore.setState({
          activeConversationId: null,
        });
      }

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          removeConversationFromQueryCache(
            cache,
            conversationId
          )
      );

      try {
        await deleteConversation(
          conversationId
        );

        useConversationStore.setState(
          (state) => {
            const conversationPatches = {
              ...state.conversationPatches,
            };

            delete conversationPatches[
              conversationId
            ];

            return {
              conversationPatches,
            };
          }
        );

        closeConversationActions();
        void queryClient.invalidateQueries({
          queryKey:
            queryKeys.conversations.all,
        });
      } catch {
        setHiddenConversationIds((current) => {
          const next = new Set(current);

          next.delete(conversationId);

          return next;
        });
        pushToast({
          title: "Could not clear chat",
          message:
            "Please try again in a moment.",
          variant: "error",
        });
      } finally {
        setClearPendingConversationId(null);
      }
    }, [
      actionConversation,
      activeConversationId,
      closeConversationActions,
      pushToast,
      queryClient,
    ]);

  const handleToggleBlock =
    useCallback(() => {
      if (!actionConversation) {
        return;
      }

      const wasBlocked =
        blockedConversationIds.has(
          actionConversation.id
        );

      setBlockedConversationIds((current) => {
        const next = new Set(current);

        if (wasBlocked) {
          next.delete(actionConversation.id);
        } else {
          next.add(actionConversation.id);
        }

        return next;
      });

      pushToast({
        title: wasBlocked
          ? "Conversation unblocked"
          : "Conversation blocked",
        message: wasBlocked
          ? "Messages from this chat are no longer locally blocked."
          : "This chat is locally blocked on this device.",
        variant: "info",
      });

      closeConversationActions();
    }, [
      actionConversation,
      blockedConversationIds,
      closeConversationActions,
      pushToast,
    ]);

  const handleToggleMute =
    useCallback(() => {
      if (!actionConversation) {
        return;
      }

      setMutedConversationIds((current) => {
        const next = new Set(current);

        if (next.has(actionConversation.id)) {
          next.delete(actionConversation.id);
        } else {
          next.add(actionConversation.id);
        }

        return next;
      });
      closeConversationActions();
    }, [
      actionConversation,
      closeConversationActions,
    ]);

  const handleSeeProfile =
    useCallback(() => {
      if (!actionConversation) {
        return;
      }

      handleSelectConversation(
        actionConversation
      );
      closeConversationActions();
      window.dispatchEvent(
        new CustomEvent(
          "flexchat:open-conversation-profile",
          {
            detail: {
              conversationId:
                actionConversation.id,
            },
          }
        )
      );
    }, [
      actionConversation,
      closeConversationActions,
      handleSelectConversation,
    ]);

  const confirmLogout =
    useCallback(() => {
      clearClientSession();
      router.replace("/auth");
    }, [router]);

  useEffect(() => {
    if (
      !conversations.length ||
      activeConversationId
    ) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 1024px)").matches
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
    <aside className="flex h-full w-full border-r border-[var(--fc-app-border)] bg-[var(--fc-app-panel)] shadow-[18px_0_80px_rgba(0,0,0,0.34)] backdrop-blur-3xl lg:w-[360px]">
      <div className="flex w-full flex-col">
        <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.025] p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-300/45 to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-600 to-violet-700 shadow-[0_16px_45px_rgba(147,51,234,0.34)]">
                <MessageCircle
                  size={24}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-white">
                  FlexChat
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                replace
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all hover:border-purple-300/30 hover:bg-purple-500/[0.12] hover:text-white"
                aria-label="Open profile"
              >
                <UserRound size={18} />
              </Link>

              <Link
                href="/settings"
                replace
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-all hover:border-purple-300/30 hover:bg-purple-500/[0.12] hover:text-white"
                aria-label="Open settings"
              >
                <Settings size={18} />
              </Link>

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
              "archive",
            ].map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() =>
                  setActiveFolder(folder)
                }
                className={`relative overflow-hidden rounded-2xl px-4 py-2 text-sm font-medium capitalize transition-all ${
                  activeFolder === folder
                    ? "text-white shadow-lg shadow-purple-600/20"
                    : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]"
                }`}
              >
                {activeFolder === folder ? (
                  <motion.span
                    layoutId="sidebar-folder-active"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600"
                    transition={{
                      type: "spring",
                      stiffness: 360,
                      damping: 32,
                    }}
                  />
                ) : null}
                <span className="relative z-10">
                  {folder}
                </span>
              </button>
            ))}
          </div>

          {deferredSearch.trim() ? null : <StoryTray />}
        </div>

        <div className="chat-safe-scroll flex-1 space-y-2 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                  currentUserId={currentUserId}
                  muted={mutedConversationIds.has(
                    conversation.id
                  )}
                  now={now}
                  onSelect={
                    handleSelectConversation
                  }
                  onContextOpen={
                    setActionConversation
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
        {actionConversation ? (
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
            className="fixed inset-0 z-[270] flex items-end justify-center bg-black/65 p-3 backdrop-blur-xl sm:items-center"
            onClick={
              closeConversationActions
            }
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 24,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 30,
              }}
              className="w-full max-w-sm overflow-hidden rounded-[30px] border border-white/10 bg-[#0B111C]/[0.97] text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {formatDisplayName(
                      actionConversation.name ??
                        "Untitled"
                    )}
                  </h2>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {actionConversation.latestMessage ??
                      "No messages yet"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeConversationActions
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
                  aria-label="Close conversation actions"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-2 p-3">
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-zinc-100 transition hover:bg-white/[0.07]"
                >
                  <Ban
                    size={18}
                    className="text-purple-200"
                  />
                  {blockedConversationIds.has(
                    actionConversation.id
                  )
                    ? "Unblock"
                    : "Block"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleClearConversation
                  }
                  disabled={
                    clearPendingConversationId ===
                    actionConversation.id
                  }
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-red-100 transition hover:bg-red-500/15"
                >
                  <Trash2 size={18} />
                  Clear Chat
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-zinc-100 transition hover:bg-white/[0.07]"
                >
                  <BellOff
                    size={18}
                    className="text-purple-200"
                  />
                  {mutedConversationIds.has(
                    actionConversation.id
                  )
                    ? "Unmute"
                    : "Mute"}
                </button>

                <button
                  type="button"
                  onClick={handleSeeProfile}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-zinc-100 transition hover:bg-white/[0.07]"
                >
                  <UserRound
                    size={18}
                    className="text-purple-200"
                  />
                  See Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

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
              className="w-full max-w-sm rounded-[30px] border border-white/10 bg-[#0B111C]/[0.96] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/[0.15] text-red-100">
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
