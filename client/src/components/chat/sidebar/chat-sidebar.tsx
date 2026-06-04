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
  Bell,
  BellOff,
  Check,
  Folder,
  LogOut,
  Mail,
  MailOpen,
  MessageCircle,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createPortal } from "react-dom";
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
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
  setConversationRead,
  updateConversationSettings,
} from "@/services/conversation.service";
import {
  removeConversationFromQueryCache,
  updateConversationInQueryCache,
} from "@/lib/conversation-query-cache";
import type {
  ConversationQueryCache,
} from "@/lib/conversation-query-cache";
import { queryKeys } from "@/lib/query-keys";
import {
  formatDisplayName,
} from "@/lib/user-display";
import { triggerHaptic } from "@/lib/haptics";
import { useSocketStore } from "@/store/socket-store";
import { useBlockStore } from "@/store/block-store";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import {
  Conversation,
  ConversationFolder,
} from "@/types/conversation";

const CONVERSATION_ROW_OVERSCAN = 12;
const CONVERSATION_ACTION_MENU_WIDTH = 248;
const CONVERSATION_ACTION_MENU_HEIGHT = 286;

const CHAT_FOLDERS: {
  id: ConversationFolder;
  label: string;
}[] = [
  {
    id: "work",
    label: "Work",
  },
  {
    id: "friends",
    label: "Friends",
  },
  {
    id: "groups",
    label: "Groups",
  },
];

const SIDEBAR_FILTERS = [
  {
    id: "all",
    label: "All",
  },
  {
    id: "unread",
    label: "Unread",
  },
  {
    id: "archive",
    label: "Archive",
  },
  ...CHAT_FOLDERS.map((folder) => ({
    id: folder.id,
    label: folder.label,
  })),
];

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

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatChatTimestamp(value?: string, now?: number) {
  if (!value) return "";

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";

  const targetNow = now ?? (Date.now() + (typeof window !== "undefined" ? window.__serverTimeOffset ?? 0 : 0));
  const diffSeconds = Math.round((targetNow - time) / 1000);
  if (diffSeconds < 60) return "Just now";

  const date = new Date(time);
  const nowDate = new Date(targetNow);

  const isSameDay =
    date.getDate() === nowDate.getDate() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getFullYear() === nowDate.getFullYear();

  if (isSameDay) {
    return TIME_FORMATTER.format(date);
  }

  const yesterday = new Date(targetNow);
  yesterday.setDate(yesterday.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Yesterday";
  }

  const isSameYear = date.getFullYear() === nowDate.getFullYear();

  if (isSameYear) {
    return DATE_FORMATTER.format(date);
  }

  return YEAR_FORMATTER.format(date);
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

function getConversationMenuPosition(
  anchorRect: DOMRect
) {
  if (typeof window === "undefined") {
    return {
      left: 12,
      top: 12,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return {
    left: Math.min(
      Math.max(
        12,
        anchorRect.left + 64
      ),
      viewportWidth -
        CONVERSATION_ACTION_MENU_WIDTH -
        12
    ),
    top: Math.min(
      Math.max(
        12,
        anchorRect.top + 6
      ),
      viewportHeight -
        CONVERSATION_ACTION_MENU_HEIGHT -
        12
    ),
  };
}

type ConversationListButtonProps = {
  conversation: Conversation;
  active: boolean;
  isOnline: boolean;
  currentUserId?: string;
  now: number;
  onSelect: (
    conversation: Conversation
  ) => void;
  onContextOpen: (
    conversation: Conversation,
    anchorRect: DOMRect
  ) => void;
};

const ConversationListButton = memo(
  function ConversationListButton({
    conversation,
    active,
    isOnline,
    currentUserId,
    now,
    onSelect,
    onContextOpen,
  }: ConversationListButtonProps) {
    const [isPressed, setIsPressed] =
      useState(false);
    const longPressTimerRef =
      useRef<ReturnType<typeof setTimeout> | null>(
        null
      );
    const longPressTriggeredRef =
      useRef(false);
    const pressStartRef =
      useRef<{ x: number; y: number } | null>(
        null
      );
    const avatar = useMemo(
      () =>
        getConversationAvatar(
          conversation,
          currentUserId
        ),
      [
        conversation,
        currentUserId,
      ]
    );
    const displayName = useMemo(
      () =>
        formatDisplayName(
          conversation.name ||
            "Untitled"
        ),
      [conversation.name]
    );
    const lastActivityLabel = useMemo(
      () =>
        formatChatTimestamp(
          conversation.lastActivityAt ??
            conversation.createdAt,
          now
        ),
      [
        conversation.createdAt,
        conversation.lastActivityAt,
        now,
      ]
    );

    const clearLongPressTimer =
      useCallback(() => {
        setIsPressed(false);
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

          pressStartRef.current = {
            x: event.clientX,
            y: event.clientY,
          };
          longPressTriggeredRef.current = false;
          clearLongPressTimer();
          setIsPressed(true);
          const target = event.currentTarget;

          longPressTimerRef.current =
            setTimeout(() => {
              longPressTriggeredRef.current = true;
              navigator.vibrate?.(10);
              onContextOpen(
                conversation,
                target.getBoundingClientRect()
              );
            }, 500);
        },
        [
          clearLongPressTimer,
          conversation,
          onContextOpen,
        ]
      );

    const handlePointerMove =
      useCallback(
        (
          event: ReactPointerEvent<HTMLButtonElement>
        ) => {
          const pressStart =
            pressStartRef.current;

          if (!pressStart) {
            return;
          }

          const dist = Math.hypot(
            event.clientX - pressStart.x,
            event.clientY - pressStart.y
          );

          if (dist > 15) {
            pressStartRef.current = null;
            clearLongPressTimer();
          }
        },
        [clearLongPressTimer]
      );

    useEffect(
      () => () => {
        clearLongPressTimer();
      },
      [clearLongPressTimer]
    );

    return (
      <button
        type="button"
        onClick={() => {
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
          }

          onSelect(conversation);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
        }}
        onPointerCancel={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
          setIsPressed(false);
        }}
        onPointerLeave={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
          setIsPressed(false);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          clearLongPressTimer();
          onContextOpen(
            conversation,
            event.currentTarget.getBoundingClientRect()
          );
        }}
        className={`group fc-telegram-touch flex h-[64px] w-full items-center gap-2.5 rounded-lg border px-3 py-0 text-left transition-[background-color,border-color,transform] duration-150 ease-out ${
          active
            ? "fc-active"
            : "border-transparent hover:bg-[#2B3A4D]"
        } ${isPressed ? "bg-[#2B3A4D]/70 scale-[0.98] border-white/5" : ""}`}
      >
        <div className="relative shrink-0">
          <FlexAvatar
            src={avatar}
            name={conversation.name}
            className="fc-avatar flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-full text-base font-bold"
          />

          {isOnline ? (
            <div className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[var(--fc-app-panel)] bg-[var(--fc-success)]" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className="truncate text-[15px] font-semibold leading-tight text-[var(--fc-theme-text)]">
                {displayName}
              </h3>

              {conversation.pinned ? (
                <Pin
                  size={12}
                  className="shrink-0 text-[var(--fc-accent-text)]"
                />
              ) : null}

              {conversation.muted ? (
                <BellOff
                  size={12}
                  className="shrink-0 text-[var(--fc-text-subtle)]"
                />
              ) : null}
            </div>

            <span suppressHydrationWarning className="shrink-0 mt-0.5 text-[10.5px] font-medium text-[#6C7883]">
              {lastActivityLabel}
            </span>
          </div>

          <div className="mt-0.5 flex items-center justify-between gap-2.5">
            <p className="truncate text-[13.5px] leading-snug text-[#6C7883]">
              {conversation.latestMessage ||
                "No messages yet"}
            </p>

            {conversation.unreadCount ? (
              <div className="fc-badge flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none">
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
    actionAnchorRect,
    setActionAnchorRect,
  ] = useState<DOMRect | null>(null);
  const [
    folderSheetConversation,
    setFolderSheetConversation,
  ] = useState<Conversation | null>(null);
  const [
    deleteConfirmConversation,
    setDeleteConfirmConversation,
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
  const [pullDistance, setPullDistance] =
    useState(0);
  const [isPullRefreshing, setIsPullRefreshing] =
    useState(false);
  const listRef = useRef<HTMLDivElement | null>(
    null
  );
  const pullGestureRef = useRef<{
    startY: number;
    active: boolean;
  } | null>(null);
  const pullDistanceFrameRef =
    useRef<number | null>(null);
  const pendingPullDistanceRef =
    useRef(0);
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

  const prevPatchedRef = useRef<Record<string, Conversation>>({});

  const patchedConversations = useMemo(() => {
    const prev = prevPatchedRef.current;
    const next: Record<string, Conversation> = {};

    const result = (conversationsQuery.data ?? [])
      .filter(
        (conversation) =>
          !hiddenConversationIds.has(conversation.id)
      )
      .map((conversation) => {
        const patch = conversationPatches[conversation.id];

        if (!patch) {
          return conversation;
        }

        const existing = prev[conversation.id];
        if (existing && (existing as Conversation & { __patch?: unknown }).__patch === patch) {
          next[conversation.id] = existing;
          return existing;
        }

        const updated = { ...conversation, ...patch };
        Object.defineProperty(updated, "__patch", {
          value: patch,
          enumerable: false,
        });
        next[conversation.id] = updated;
        return updated;
      });

    prevPatchedRef.current = next;
    return result;
  }, [
    conversationsQuery.data,
    conversationPatches,
    hiddenConversationIds,
  ]);

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

  // eslint-disable-next-line react-hooks/incompatible-library
  const conversationVirtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 64,
    getItemKey: (index) =>
      filteredConversations[index]?.id ?? index,
    overscan: CONVERSATION_ROW_OVERSCAN,
  });
  const virtualConversationRows =
    conversationVirtualizer.getVirtualItems();

  const handleSelectConversation =
    useCallback(
      (conversation: Conversation) => {
        triggerHaptic(10);
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
      setActionAnchorRect(null);
    }, []);

  const openConversationActions =
    useCallback(
      (
        conversation: Conversation,
        anchorRect: DOMRect
      ) => {
        setActionConversation(conversation);
        setActionAnchorRect(anchorRect);
      },
      []
    );

  const patchConversation =
    useCallback(
      (
        conversationId: string,
        patch: Partial<Conversation>
      ) => {
        queryClient.setQueryData<ConversationQueryCache>(
          queryKeys.conversations.all,
          (cache) =>
            updateConversationInQueryCache(
              cache,
              conversationId,
              (conversation) => ({
                ...conversation,
                ...patch,
              })
            )
        );

        useConversationStore.setState((state) => ({
          conversationPatches: {
            ...state.conversationPatches,
            [conversationId]: {
              ...state.conversationPatches[
                conversationId
              ],
              ...patch,
            },
          },
        }));
      },
      [queryClient]
    );

  const handleClearConversation =
    useCallback(async () => {
      const targetConversation =
        deleteConfirmConversation ??
        actionConversation;

      if (!targetConversation) {
        return;
      }

      triggerHaptic(10);
      const conversationId =
        targetConversation.id;

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
        setDeleteConfirmConversation(null);
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
          title: "Could not delete chat",
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
      deleteConfirmConversation,
      pushToast,
      queryClient,
    ]);

  const handlePullStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (
        activeConversationId ||
        (listRef.current?.scrollTop ?? 0) > 2 ||
        isPullRefreshing
      ) {
        pullGestureRef.current = null;
        return;
      }

      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      pullGestureRef.current = {
        startY: touch.clientY,
        active: true,
      };
    },
    [activeConversationId, isPullRefreshing],
  );

  const schedulePullDistance =
    useCallback((distance: number) => {
      pendingPullDistanceRef.current =
        distance;

      if (pullDistanceFrameRef.current !== null) {
        return;
      }

      pullDistanceFrameRef.current =
        window.requestAnimationFrame(() => {
          pullDistanceFrameRef.current = null;
          setPullDistance(
            pendingPullDistanceRef.current
          );
        });
    }, []);

  const setPullDistanceNow =
    useCallback((distance: number) => {
      if (pullDistanceFrameRef.current !== null) {
        window.cancelAnimationFrame(
          pullDistanceFrameRef.current
        );
        pullDistanceFrameRef.current = null;
      }

      pendingPullDistanceRef.current =
        distance;
      setPullDistance(distance);
    }, []);

  useEffect(
    () => () => {
      if (pullDistanceFrameRef.current !== null) {
        window.cancelAnimationFrame(
          pullDistanceFrameRef.current
        );
        pullDistanceFrameRef.current = null;
      }
    },
    []
  );

  const handlePullMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const gesture = pullGestureRef.current;
      const touch = event.touches[0];

      if (!gesture || !touch || !gesture.active) {
        return;
      }

      const deltaY = touch.clientY - gesture.startY;

      if (deltaY <= 0) {
        schedulePullDistance(0);
        return;
      }

      // Non-linear resistance curve for Telegram-like tension
      const tension = 220;
      const maxPull = 100;
      const easedDistance =
        maxPull *
        (1 - Math.exp(-deltaY / tension));

      schedulePullDistance(easedDistance);
    },
    [schedulePullDistance],
  );

  const handlePullEnd = useCallback(() => {
    const shouldRefresh =
      pendingPullDistanceRef.current >= 62 &&
      !isPullRefreshing;

    pullGestureRef.current = null;

    if (!shouldRefresh) {
      setPullDistanceNow(0);
      return;
    }

    triggerHaptic(10);
    setIsPullRefreshing(true);
    setPullDistanceNow(62);

    void conversationsQuery
      .refetch()
      .finally(() => {
        setIsPullRefreshing(false);
        setPullDistanceNow(0);
      });
  }, [
    conversationsQuery,
    isPullRefreshing,
    setPullDistanceNow,
  ]);

  const handleToggleBlock =
    useCallback(() => {
      if (!actionConversation) {
        return;
      }

      triggerHaptic(10);
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

  const handleTogglePin =
    useCallback(async () => {
      if (!actionConversation) {
        return;
      }

      const conversationId =
        actionConversation.id;
      const nextPinned =
        !actionConversation.pinned;
      const pinnedAt =
        nextPinned
          ? new Date().toISOString()
          : null;

      triggerHaptic(10);
      patchConversation(conversationId, {
        pinned:
          nextPinned,
        pinnedAt,
      });
      closeConversationActions();

      try {
        const conversation =
          await updateConversationSettings({
            conversationId,
            pinned:
              nextPinned,
          });

        patchConversation(
          conversationId,
          conversation
        );
      } catch {
        patchConversation(conversationId, {
          pinned:
            actionConversation.pinned,
          pinnedAt:
            actionConversation.pinnedAt ?? null,
        });
        pushToast({
          title: "Pin failed",
          message:
            "That chat could not be updated right now.",
          variant: "error",
        });
      }
    }, [
      actionConversation,
      closeConversationActions,
      patchConversation,
      pushToast,
    ]);

  const handleToggleRead =
    useCallback(async () => {
      if (!actionConversation) {
        return;
      }

      const conversationId =
        actionConversation.id;
      const shouldMarkRead =
        !!actionConversation.unreadCount;
      const optimisticUnreadCount =
        shouldMarkRead ? 0 : 1;

      triggerHaptic(10);
      patchConversation(conversationId, {
        unreadCount:
          optimisticUnreadCount,
      });
      closeConversationActions();

      try {
        const conversation =
          await setConversationRead(
            conversationId,
            shouldMarkRead
          );

        patchConversation(
          conversationId,
          conversation
        );
      } catch {
        patchConversation(conversationId, {
          unreadCount:
            actionConversation.unreadCount ?? 0,
        });
        pushToast({
          title: "Read state failed",
          message:
            "That chat could not be updated right now.",
          variant: "error",
        });
      }
    }, [
      actionConversation,
      closeConversationActions,
      patchConversation,
      pushToast,
    ]);

  const handleToggleMute =
    useCallback(async () => {
      if (!actionConversation) {
        return;
      }

      triggerHaptic(10);
      const conversationId =
        actionConversation.id;
      const nextMuted =
        !actionConversation.muted;
      const mutedAt =
        nextMuted
          ? new Date().toISOString()
          : null;

      patchConversation(conversationId, {
        muted:
          nextMuted,
        mutedAt,
      });
      closeConversationActions();

      try {
        const conversation =
          await updateConversationSettings({
            conversationId,
            muted:
              nextMuted,
          });

        patchConversation(
          conversationId,
          conversation
        );
      } catch {
        patchConversation(conversationId, {
          muted:
            actionConversation.muted,
          mutedAt:
            actionConversation.mutedAt ?? null,
        });
        pushToast({
          title: "Mute failed",
          message:
            "That chat could not be updated right now.",
          variant: "error",
        });
      }
    }, [
      actionConversation,
      closeConversationActions,
      patchConversation,
      pushToast,
    ]);

  const handleOpenFolderSheet =
    useCallback(() => {
      if (!actionConversation) {
        return;
      }

      triggerHaptic(10);
      setFolderSheetConversation(
        actionConversation
      );
      closeConversationActions();
    }, [
      actionConversation,
      closeConversationActions,
    ]);

  const handleAssignFolder =
    useCallback(
      async (
        folder: ConversationFolder | null
      ) => {
        if (!folderSheetConversation) {
          return;
        }

        const conversationId =
          folderSheetConversation.id;

        triggerHaptic(10);
        patchConversation(conversationId, {
          folder,
        });

        try {
          const conversation =
            await updateConversationSettings({
              conversationId,
              folder,
            });

          patchConversation(
            conversationId,
            conversation
          );
          setFolderSheetConversation(null);
        } catch {
          patchConversation(conversationId, {
            folder:
              folderSheetConversation.folder ?? null,
          });
          pushToast({
            title: "Folder update failed",
            message:
              "That chat could not be moved right now.",
            variant: "error",
          });
        }
      },
      [
        folderSheetConversation,
        patchConversation,
        pushToast,
      ]
    );

  const handleCreateFolder =
    useCallback(() => {
      triggerHaptic(10);
      pushToast({
        title: "Folder creation coming soon",
        message:
          "For now you can use Work, Friends, or Groups.",
        variant: "info",
      });
    }, [pushToast]);

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

  useEffect(() => {
    function handleSidebarEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (actionConversation) {
        closeConversationActions();
        return;
      }

      if (folderSheetConversation) {
        setFolderSheetConversation(null);
        return;
      }

      if (deleteConfirmConversation) {
        setDeleteConfirmConversation(null);
        return;
      }

      if (logoutConfirmOpen) {
        setLogoutConfirmOpen(false);
      }
    }

    window.addEventListener("keydown", handleSidebarEscape);

    return () => {
      window.removeEventListener("keydown", handleSidebarEscape);
    };
  }, [
    actionConversation,
    closeConversationActions,
    deleteConfirmConversation,
    folderSheetConversation,
    logoutConfirmOpen,
  ]);

  return (
    <aside className="fc-panel flex h-full w-full border-r border-[#0D1823] lg:w-[360px]">
      <div className="flex w-full flex-col">
        <div className="fc-panel-strong relative border-b border-[#0D1823] px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="fc-button-primary flex h-9 w-9 items-center justify-center rounded-lg">
                <MessageCircle
                  size={19}
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
                onClick={() => {
                  triggerHaptic(10);
                  setSearchOpen((open) => !open);
                }}
                className="fc-hover flex h-9 w-9 items-center justify-center rounded-full text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)]"
                aria-label="Search conversations"
              >
                <Search size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setLogoutConfirmOpen(true);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fc-text-muted)] transition hover:bg-red-500/[0.12] hover:text-red-100"
                aria-label="Logout"
              >
                <LogOut size={17} />
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
                <div className="relative mt-2">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search"
                    className="fc-input h-9 w-full rounded-lg border pl-10 pr-3 text-sm outline-none"
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="fc-no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {SIDEBAR_FILTERS.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setActiveFolder(folder.id);
                }}
                className={`relative shrink-0 overflow-hidden rounded-lg px-3 py-1 text-sm font-medium transition-all ${
                  activeFolder === folder.id
                    ? "text-white"
                    : "fc-surface text-[var(--fc-text-muted)] hover:bg-[var(--fc-app-surface-hover)]"
                }`}
              >
                {activeFolder === folder.id ? (
                  <motion.span
                    layoutId="sidebar-folder-active"
                    className="absolute inset-0 rounded-lg bg-[var(--fc-primary)]"
                    transition={{
                      type: "spring",
                      stiffness: 360,
                      damping: 32,
                    }}
                  />
                ) : null}
                <span className="relative z-10">
                  {folder.label}
                </span>
              </button>
            ))}
          </div>

          {deferredSearch.trim() ? null : <StoryTray />}
        </div>

        <div
          ref={listRef}
          onTouchStart={handlePullStart}
          onTouchMove={handlePullMove}
          onTouchEnd={handlePullEnd}
          onTouchCancel={handlePullEnd}
          className="chat-safe-scroll relative flex-1 overflow-y-auto px-1.5 py-1 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <div
            className="pointer-events-none sticky top-0 z-10 flex justify-center overflow-hidden transition-[height]"
            style={{
              height: `${pullDistance}px`,
            }}
          >
            <div
              className={`mt-1.5 flex h-9 min-w-9 items-center justify-center rounded-full border border-[rgba(var(--fc-primary-rgb),0.24)] bg-[var(--fc-app-elevated)] text-[var(--fc-accent-text)] shadow-lg ${
                isPullRefreshing ? "animate-spin" : ""
              }`}
              style={{
                opacity: pullDistance > 8 ? 1 : 0,
                transform: `scale(${Math.min(1, 0.72 + pullDistance / 120)})`,
              }}
            >
              <RefreshCw size={16} />
            </div>
          </div>

          {conversationsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({
                length: 8,
              }).map((_, index) => (
                <div
                  key={index}
                  className="fc-skeleton h-[64px] animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : null}

          {conversationsQuery.isError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Unable to load conversations
            </div>
          ) : null}

          <div
            className="relative w-full"
            style={{
              height: `${conversationVirtualizer.getTotalSize()}px`,
            }}
          >
            {virtualConversationRows.map(
              (virtualRow) => {
                const conversation =
                  filteredConversations[
                    virtualRow.index
                  ];

                if (!conversation) {
                  return null;
                }

                const active =
                  activeConversationId ===
                  conversation.id;
                const isOnline =
                  hasOnlinePeer(
                    conversation,
                    onlineUserIds,
                    currentUserId
                  );

                return (
                  <div
                    key={virtualRow.key}
                    ref={
                      conversationVirtualizer.measureElement
                    }
                    data-index={virtualRow.index}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ConversationListButton
                      conversation={conversation}
                      active={active}
                      isOnline={isOnline}
                      currentUserId={currentUserId}
                      now={now}
                      onSelect={
                        handleSelectConversation
                      }
                      onContextOpen={
                        openConversationActions
                      }
                    />
                  </div>
                );
              }
            )}
          </div>

          {conversationsQuery.hasNextPage ? (
            <button
              type="button"
              onClick={() => {
                void conversationsQuery.fetchNextPage();
              }}
              disabled={
                conversationsQuery.isFetchingNextPage
              }
              className="fc-surface fc-hover mt-3 w-full rounded-xl border px-4 py-2 text-sm font-medium text-[var(--fc-text-muted)] transition hover:border-[rgba(var(--fc-primary-rgb),0.35)] hover:text-[var(--fc-theme-text)] disabled:cursor-wait disabled:opacity-60"
            >
              {conversationsQuery.isFetchingNextPage
                ? "Loading..."
                : "Load more"}
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {actionConversation &&
        actionAnchorRect &&
        typeof document !== "undefined"
          ? createPortal(
              <motion.div
                key="conversation-action-menu"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.15,
                }}
                className="fixed inset-0 z-[270] touch-none bg-black/40"
                onPointerDown={
                  closeConversationActions
                }
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.94,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.94,
                  }}
                  transition={{
                    duration: 0.15,
                    ease: "easeOut",
                  }}
                  style={{
                    ...getConversationMenuPosition(
                      actionAnchorRect
                    ),
                    width:
                      CONVERSATION_ACTION_MENU_WIDTH,
                  }}
                  className="fixed overflow-hidden rounded-[18px] border border-white/10 bg-[#17212B]/95 py-1.5 text-white shadow-[0_18px_54px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
                  onPointerDown={(event) =>
                    event.stopPropagation()
                  }
                  role="menu"
                  aria-label="Conversation actions"
                >
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium text-white/90 transition hover:bg-white/[0.07]"
                  >
                    <Pin
                      size={18}
                      className="text-[#8ED4FF]"
                    />
                    {actionConversation.pinned
                      ? "Unpin"
                      : "Pin"}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenFolderSheet}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium text-white/90 transition hover:bg-white/[0.07]"
                  >
                    <Folder
                      size={18}
                      className="text-[#8ED4FF]"
                    />
                    Add to Folder
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleRead}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium text-white/90 transition hover:bg-white/[0.07]"
                  >
                    {actionConversation.unreadCount ? (
                      <MailOpen
                        size={18}
                        className="text-[#8ED4FF]"
                      />
                    ) : (
                      <Mail
                        size={18}
                        className="text-[#8ED4FF]"
                      />
                    )}
                    {actionConversation.unreadCount
                      ? "Mark as Read"
                      : "Mark as Unread"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmConversation(
                        actionConversation
                      );
                      closeConversationActions();
                    }}
                    disabled={
                      clearPendingConversationId ===
                      actionConversation.id
                    }
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium text-red-100 transition hover:bg-red-500/15 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Trash2 size={18} />
                    Delete Chat
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium text-white/90 transition hover:bg-white/[0.07]"
                  >
                    {actionConversation.muted ? (
                      <Bell
                        size={18}
                        className="text-[#8ED4FF]"
                      />
                    ) : (
                      <BellOff
                        size={18}
                        className="text-[#8ED4FF]"
                      />
                    )}
                    {actionConversation.muted
                      ? "Unmute"
                      : "Mute"}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-medium text-white/90 transition hover:bg-white/[0.07]"
                  >
                    <Ban
                      size={18}
                      className="text-[#8ED4FF]"
                    />
                    {blockedConversationSet.has(
                      actionConversation.id
                    )
                      ? "Unblock"
                      : "Block"}
                  </button>
                </motion.div>
              </motion.div>,
              document.body
            )
          : null}

        {folderSheetConversation ? (
          <motion.div
            key="conversation-folder-sheet"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[275] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6 sm:backdrop-blur-xl"
            onPointerDown={() =>
              setFolderSheetConversation(null)
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
                stiffness: 320,
                damping: 30,
              }}
              className="fc-modal w-full max-w-sm overflow-hidden rounded-2xl border"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] px-5 py-4">
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    Add to Folder
                  </h2>
                  <p className="fc-subtle truncate text-xs">
                    {formatDisplayName(
                      folderSheetConversation.name ??
                        "Untitled"
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFolderSheetConversation(null)
                  }
                  className="fc-surface fc-hover flex h-10 w-10 items-center justify-center rounded-2xl border transition"
                  aria-label="Close folder sheet"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-1 p-3">
                {CHAT_FOLDERS.map((folder) => {
                  const selected =
                    folderSheetConversation.folder ===
                    folder.id;

                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        void handleAssignFolder(
                          folder.id
                        );
                      }}
                      className="fc-hover flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium text-[var(--fc-theme-text)] transition"
                    >
                      <Folder
                        size={18}
                        className="text-[var(--fc-accent-text)]"
                      />
                      <span className="flex-1">
                        {folder.label}
                      </span>
                      {selected ? (
                        <Check size={17} />
                      ) : null}
                    </button>
                  );
                })}

                {folderSheetConversation.folder ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleAssignFolder(null);
                    }}
                    className="fc-hover flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium text-[var(--fc-theme-text)] transition"
                  >
                    <X
                      size={18}
                      className="text-[var(--fc-accent-text)]"
                    />
                    Remove from Folder
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleCreateFolder}
                  className="fc-hover flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-medium text-[var(--fc-theme-text)] transition"
                >
                  <Plus
                    size={18}
                    className="text-[var(--fc-accent-text)]"
                  />
                  Create Folder
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {deleteConfirmConversation ? (
          <motion.div
            key="conversation-delete-confirm"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[276] flex items-center justify-center bg-[var(--fc-overlay-strong)] p-4 sm:backdrop-blur-xl"
            onPointerDown={() =>
              setDeleteConfirmConversation(null)
            }
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
              className="fc-modal w-full max-sm:max-w-none rounded-2xl border p-5"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/[0.15] text-red-100">
                  <Trash2 size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    Delete this chat?
                  </h2>
                  <p className="fc-muted mt-1 text-sm leading-relaxed">
                    It will be removed from your chat list.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirmConversation(null)
                  }
                  disabled={
                    clearPendingConversationId ===
                    deleteConfirmConversation.id
                  }
                  className="fc-surface fc-hover h-12 rounded-2xl border text-sm font-medium text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)] disabled:cursor-wait disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleClearConversation();
                  }}
                  disabled={
                    clearPendingConversationId ===
                    deleteConfirmConversation.id
                  }
                  className="h-12 rounded-2xl bg-red-500 text-sm font-semibold text-white shadow-xl shadow-red-500/25 transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
                >
                  Delete
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
            className="fixed inset-0 z-[280] flex items-center justify-center bg-[var(--fc-overlay-strong)] p-4 sm:backdrop-blur-xl"
            onPointerDown={() =>
              setLogoutConfirmOpen(false)
            }
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
              className="fc-modal w-full max-w-sm rounded-2xl border p-5 sm:backdrop-blur-3xl"
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
