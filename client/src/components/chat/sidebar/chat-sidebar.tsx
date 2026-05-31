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
import { useBlockStore } from "@/store/block-store";
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
              navigator.vibrate?.(6);
              onContextOpen(conversation);
            }, 340);
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
        whileTap={{
          scale: 0.992,
        }}
        transition={{
          duration: 0.12,
        }}
        className={`group fc-telegram-touch flex min-h-[72px] w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all ${
          active
            ? "fc-active"
            : "border-transparent hover:bg-[var(--fc-app-surface-hover)]"
        }`}
      >
        <div className="relative">
          <FlexAvatar
            src={avatar}
            name={conversation.name}
            className="fc-avatar flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-base font-bold"
          />

          {isOnline ? (
            <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--fc-app-panel)] bg-[var(--fc-success)]" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate font-semibold text-[var(--fc-theme-text)]">
                {formatDisplayName(
                  conversation.name ||
                    "Untitled"
                )}
              </h3>

              {conversation.pinned ? (
                <Pin
                  size={13}
                  className="shrink-0 text-[var(--fc-accent-text)]"
                />
              ) : null}

              {muted ? (
                <BellOff
                  size={13}
                  className="shrink-0 text-[var(--fc-text-subtle)]"
                />
              ) : null}
            </div>

            <span className="fc-subtle shrink-0 text-[11px]">
              {formatConversationTime(
                conversation.lastActivityAt ??
                  conversation.createdAt,
                now
              )}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="fc-muted truncate text-sm">
              {conversation.latestMessage ||
                "No messages yet"}
            </p>

            {conversation.unreadCount ? (
              <div className="fc-badge flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
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
  const [searchOpen, setSearchOpen] =
    useState(true);
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
  const blockedConversationIds = useBlockStore(
    (state) => state.blockedConversationIds
  );
  const blockConversation = useBlockStore(
    (state) => state.blockConversation
  );
  const unblockConversation = useBlockStore(
    (state) => state.unblockConversation
  );
  const blockedConversationSet = useMemo(
    () => new Set(blockedConversationIds),
    [blockedConversationIds]
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
        blockedConversationSet.has(
          actionConversation.id
        );

      if (wasBlocked) {
        unblockConversation(
          actionConversation.id,
          formatDisplayName(
            actionConversation.name ?? "this user"
          )
        );
      } else {
        blockConversation(
          actionConversation.id,
          formatDisplayName(
            actionConversation.name ?? "this user"
          )
        );
      }

      pushToast({
        title: wasBlocked
          ? `${formatDisplayName(actionConversation.name ?? "User")} unblocked`
          : `${formatDisplayName(actionConversation.name ?? "User")} blocked`,
        message: wasBlocked
          ? "You can message this chat again."
          : "Messages and calls are paused for this chat.",
        variant: "info",
      });

      closeConversationActions();
    }, [
      actionConversation,
      blockConversation,
      blockedConversationSet,
      closeConversationActions,
      pushToast,
      unblockConversation,
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
    <aside className="fc-panel flex h-full w-full border-r backdrop-blur-xl lg:w-[360px]">
      <div className="flex w-full flex-col">
        <div className="fc-panel-strong relative border-b px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="fc-button-primary flex h-10 w-10 items-center justify-center rounded-2xl">
                <MessageCircle
                  size={20}
                />
              </div>

              <div>
                <h1 className="text-lg font-semibold text-[var(--fc-theme-text)]">
                  FlexChat
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setSearchOpen((open) => !open)
                }
                className="fc-hover flex h-10 w-10 items-center justify-center rounded-full text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)]"
                aria-label="Search conversations"
              >
                <Search size={19} />
              </button>

              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--fc-text-muted)] transition hover:bg-red-500/[0.12] hover:text-red-100"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {searchOpen || search ? (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                }}
                animate={{
                  opacity: 1,
                  height: "auto",
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                }}
                transition={{
                  duration: 0.18,
                }}
                className="overflow-hidden"
              >
                <div className="relative mt-3">
                  <Search
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search conversations..."
                    className="fc-input h-11 w-full rounded-2xl border pl-11 pr-4 text-sm outline-none"
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
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
                    ? "text-white"
                    : "fc-surface text-[var(--fc-text-muted)] hover:bg-[var(--fc-app-surface-hover)]"
                }`}
              >
                {activeFolder === folder ? (
                  <motion.span
                    layoutId="sidebar-folder-active"
                    className="absolute inset-0 rounded-2xl bg-[var(--fc-primary)]"
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

        <div className="chat-safe-scroll flex-1 space-y-1 overflow-y-auto px-2 py-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {conversationsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="fc-skeleton h-[88px] animate-pulse rounded-2xl"
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
              className="fc-surface fc-hover mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-medium text-[var(--fc-text-muted)] transition hover:border-[rgba(var(--fc-primary-rgb),0.35)] hover:text-[var(--fc-theme-text)] disabled:cursor-wait disabled:opacity-60"
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
            className="fixed inset-0 z-[270] flex items-end justify-center bg-[var(--fc-overlay)] p-3 backdrop-blur-xl sm:items-center"
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
              className="fc-modal w-full max-w-sm overflow-hidden rounded-2xl border"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] p-5">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {formatDisplayName(
                      actionConversation.name ??
                        "Untitled"
                    )}
                  </h2>
                  <p className="fc-subtle mt-1 truncate text-xs">
                    {actionConversation.latestMessage ??
                      "No messages yet"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeConversationActions
                  }
                  className="fc-surface fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition"
                  aria-label="Close conversation actions"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-2 p-3">
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className="fc-hover flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-[var(--fc-theme-text)] transition"
                >
                  <Ban
                    size={18}
                    className="text-[var(--fc-accent-text)]"
                  />
                  {blockedConversationSet.has(
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
                  className="fc-hover flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-[var(--fc-theme-text)] transition"
                >
                  <BellOff
                    size={18}
                    className="text-[var(--fc-accent-text)]"
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
                    className="text-[#9BD0FF]"
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
            className="fixed inset-0 z-[280] flex items-center justify-center bg-[var(--fc-overlay-strong)] p-4 backdrop-blur-xl"
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
              className="fc-modal w-full max-w-sm rounded-2xl border p-5 backdrop-blur-3xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/[0.15] text-red-100">
                  <AlertTriangle size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    Log out?
                  </h2>
                  <p className="fc-muted mt-1 text-sm leading-relaxed">
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
                  className="fc-surface fc-hover h-12 rounded-2xl border text-sm font-medium text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)]"
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
