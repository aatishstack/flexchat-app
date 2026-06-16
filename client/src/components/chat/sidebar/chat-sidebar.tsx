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
        className={`group w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors ${
          active
            ? "bg-[#7C4FF0] text-white"
            : "hover:bg-white/[0.04] text-white"
        } ${isPressed ? "scale-[0.98] opacity-80" : ""}`}
      >
        <div className="relative shrink-0">
          <FlexAvatar
            src={avatar}
            name={conversation.name}
            className={`flex h-[56px] w-[56px] items-center justify-center overflow-hidden rounded-full text-[19px] font-bold ${active ? "bg-white/20" : "bg-[#16161D] border border-white/5 shadow-sm"}`}
          />

          {isOnline ? (
            <div className={`absolute bottom-[2px] right-[2px] h-[13px] w-[13px] rounded-full border-[2.5px] ${active ? "border-[#7C4FF0]" : "border-[#0C0C10]"} bg-[#22C55E]`} />
          ) : null}
        </div>

        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className={`truncate text-[16.5px] font-bold tracking-tight ${active ? "text-white" : "text-white/95"}`}>
                {displayName}
              </h3>

              {conversation.pinned ? (
                <Pin
                  size={12}
                  className={`shrink-0 ml-0.5 ${active ? "text-white/80" : "text-[#7C4FF0]"}`}
                />
              ) : null}

              {conversation.muted ? (
                <BellOff
                  size={12}
                  className={`shrink-0 ml-0.5 ${active ? "text-white/60" : "text-white/30"}`}
                />
              ) : null}
            </div>

            <span suppressHydrationWarning className={`shrink-0 text-[11px] font-bold tracking-wide ${active ? "text-white/70" : "text-white/25"}`}>
              {lastActivityLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className={`truncate text-[14.5px] leading-snug ${active ? "text-white/85 font-medium" : conversation.unreadCount ? "text-white/90 font-semibold" : "text-white/45 font-medium"}`}>
              {conversation.latestMessage ||
                "No messages yet"}
            </p>

            {conversation.unreadCount ? (
              <div className={`flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-black leading-none ${active ? "bg-white text-[#7C4FF0]" : "bg-[#7C4FF0] text-white shadow-lg shadow-[#7C4FF0]/20"}`}>
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
  const {
    conversationPatches,
    activeConversationId,
    setActiveConversation,
  } = useConversationStore(
    useShallow((state) => ({
      conversationPatches: state.conversationPatches,
      activeConversationId: state.activeConversationId,
      setActiveConversation: state.setActiveConversation,
    }))
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

  const {
    blockedConversationIds,
    blockConversation,
    unblockConversation,
  } = useBlockStore(
    useShallow((state) => ({
      blockedConversationIds: state.blockedConversationIds,
      blockConversation: state.blockConversation,
      unblockConversation: state.unblockConversation,
    }))
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

  const conversationVirtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 68,
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
    <aside className="fc-panel fc-gpu-accelerated flex h-full w-full border-r border-white/5 lg:w-[360px] bg-[#0C0C10]">
      <div className="flex w-full flex-col">
        <div className="px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-black tracking-tighter leading-none">
                <span className="text-white">Flex</span>
                <span className="text-[#7C4FF0]">Chat</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  router.push("/contacts");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
                aria-label="New Chat"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search conversations"
              className="h-10 w-full rounded-[14px] bg-white/[0.03] pl-10 pr-4 text-[14.5px] font-medium text-white outline-none transition-all placeholder:text-white/20 focus:bg-white/[0.05] border border-white/[0.02] focus:border-[#7C4FF0]/20"
            />
          </div>

          {/* StoryTray removed - Migrated to dedicated Status screen */}
        </div>

        <div
          ref={listRef}
          onTouchStart={handlePullStart}
          onTouchMove={handlePullMove}
          onTouchEnd={handlePullEnd}
          onTouchCancel={handlePullEnd}
          className="chat-safe-scroll relative flex-1 overflow-y-auto px-2 py-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
        >
          <div
            className="pointer-events-none sticky top-0 z-10 flex justify-center overflow-hidden transition-[height]"
            style={{
              height: `${pullDistance}px`,
            }}
          >
            <div
              className={`mt-1.5 flex h-9 min-w-9 items-center justify-center rounded-full bg-[#16161D] text-[#7C4FF0] shadow-lg ${
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
            <div className="space-y-3 px-3">
              {Array.from({
                length: 12,
              }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 animate-pulse rounded-full bg-white/5" />
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}


          {conversationsQuery.isError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 mx-2 mt-2">
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
              className="mt-3 mx-2 w-[calc(100%-16px)] rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-[14px] font-bold text-white/50 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              {conversationsQuery.isFetchingNextPage
                ? "Loading..."
                : "Load older chats"}
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
                className="fixed inset-0 z-[270] touch-none bg-black/60"
                onPointerDown={
                  closeConversationActions
                }
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.94,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.94,
                    y: 8,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    ...getConversationMenuPosition(
                      actionAnchorRect
                    ),
                    width:
                      CONVERSATION_ACTION_MENU_WIDTH,
                  }}
                  className="fixed overflow-hidden rounded-[20px] border border-white/10 bg-[#16161D] py-2 text-white shadow-[0_32px_96px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
                  onPointerDown={(event) =>
                    event.stopPropagation()
                  }
                  role="menu"
                  aria-label="Conversation actions"
                >
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-[14px] font-semibold text-white/90 transition hover:bg-white/[0.06]"
                  >
                    <Pin
                      size={18}
                      className="text-[#7C4FF0]"
                    />
                    {actionConversation.pinned
                      ? "Unpin"
                      : "Pin"}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenFolderSheet}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-[14px] font-semibold text-white/90 transition hover:bg-white/[0.06]"
                  >
                    <Folder
                      size={18}
                      className="text-[#7C4FF0]"
                    />
                    Add to Folder
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleRead}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-[14px] font-semibold text-white/90 transition hover:bg-white/[0.06]"
                  >
                    {actionConversation.unreadCount ? (
                      <MailOpen
                        size={18}
                        className="text-[#7C4FF0]"
                      />
                    ) : (
                      <Mail
                        size={18}
                        className="text-[#7C4FF0]"
                      />
                    )}
                    {actionConversation.unreadCount
                      ? "Mark as Read"
                      : "Mark as Unread"}
                  </button>

                  <div className="my-1 h-[1px] bg-white/5" />

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-[14px] font-semibold text-white/90 transition hover:bg-white/[0.06]"
                  >
                    {actionConversation.muted ? (
                      <Bell
                        size={18}
                        className="text-[#7C4FF0]"
                      />
                    ) : (
                      <BellOff
                        size={18}
                        className="text-[#7C4FF0]"
                      />
                    )}
                    {actionConversation.muted
                      ? "Unmute"
                      : "Mute"}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-[14px] font-semibold text-white/90 transition hover:bg-white/[0.06]"
                  >
                    <Ban
                      size={18}
                      className="text-[#7C4FF0]"
                    />
                    {blockedConversationSet.has(
                      actionConversation.id
                    )
                      ? "Unblock"
                      : "Block"}
                  </button>

                  <div className="my-1 h-[1px] bg-white/5" />

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
                    className="flex h-11 w-full items-center gap-3 px-4 text-left text-[14px] font-bold text-red-400 transition hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Trash2 size={18} />
                    Delete Chat
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
            className="fixed inset-0 z-[275] flex items-end justify-center bg-black/70 p-4 sm:items-center sm:p-6 sm:backdrop-blur-xl"
            onPointerDown={() =>
              setFolderSheetConversation(null)
            }
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 40,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 40,
                scale: 0.94,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 32,
              }}
              className="fc-modal w-full max-w-[400px] overflow-hidden rounded-[24px] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] px-6 py-5">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">
                    Add to Folder
                  </h2>
                  <p className="fc-subtle mt-0.5 truncate text-[13px] font-medium">
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
                  className="fc-surface fc-hover flex h-10 w-10 items-center justify-center rounded-full border border-[var(--fc-app-border)] transition"
                  aria-label="Close folder sheet"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-1.5 p-4">
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
                      className={`fc-hover flex h-[56px] items-center gap-4 rounded-2xl px-4 text-left text-[15px] font-bold transition ${
                        selected ? "bg-[#7C4FF0]/10 text-[#7C4FF0]" : "text-white"
                      }`}
                    >
                      <Folder
                        size={20}
                        className={selected ? "text-[#7C4FF0]" : "text-white/40"}
                      />
                      <span className="flex-1">
                        {folder.label}
                      </span>
                      {selected ? (
                        <Check size={20} />
                      ) : null}
                    </button>
                  );
                })}

                <div className="my-1.5 h-[1px] bg-white/5" />

                {folderSheetConversation.folder ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleAssignFolder(null);
                    }}
                    className="fc-hover flex h-[56px] items-center gap-4 rounded-2xl px-4 text-left text-[15px] font-bold text-red-400 transition hover:bg-red-500/10"
                  >
                    <X
                      size={20}
                    />
                    Remove from Folder
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleCreateFolder}
                  className="fc-hover flex h-[56px] items-center gap-4 rounded-2xl px-4 text-left text-[15px] font-bold text-white/50 transition hover:text-white"
                >
                  <Plus
                    size={20}
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
            className="fixed inset-0 z-[276] flex items-center justify-center bg-black/80 p-5 sm:backdrop-blur-xl"
            onPointerDown={() =>
              setDeleteConfirmConversation(null)
            }
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 24,
                scale: 0.94,
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 30,
              }}
              className="fc-modal w-full max-w-[400px] overflow-hidden rounded-[24px] border border-white/10 p-7 shadow-[0_48px_128px_rgba(0,0,0,1)]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-red-500/10 bg-red-500/5 text-red-400">
                  <Trash2 size={28} />
                </div>

                <div className="mt-5">
                  <h2 className="text-xl font-bold">
                    Delete Chat?
                  </h2>
                  <p className="fc-muted mt-2 text-[15px] leading-relaxed">
                    This will remove the conversation from your list. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirmConversation(null)
                  }
                  disabled={
                    clearPendingConversationId ===
                    deleteConfirmConversation.id
                  }
                  className="fc-surface fc-hover h-[52px] rounded-2xl border border-[var(--fc-app-border)] text-[15px] font-bold text-white/50 transition hover:text-white disabled:cursor-wait disabled:opacity-60"
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
                  className="h-[52px] rounded-2xl bg-red-500 text-[15px] font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
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
            className="fixed inset-0 z-[280] flex items-center justify-center bg-black/80 p-5 sm:backdrop-blur-xl"
            onPointerDown={() =>
              setLogoutConfirmOpen(false)
            }
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 24,
                scale: 0.94,
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 30,
              }}
              className="fc-modal w-full max-w-[400px] overflow-hidden rounded-[24px] border border-white/10 p-7 shadow-[0_48px_128px_rgba(0,0,0,1)]"
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#7C4FF0]/10 bg-[#7C4FF0]/5 text-[#7C4FF0]">
                  <LogOut size={28} />
                </div>

                <div className="mt-5">
                  <h2 className="text-xl font-bold text-white">
                    Sign Out?
                  </h2>
                  <p className="fc-muted mt-2 text-[15px] leading-relaxed">
                    You will need to sign in again to access your chats and receive notifications.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setLogoutConfirmOpen(false)
                  }
                  className="fc-surface fc-hover h-[52px] rounded-2xl border border-[var(--fc-app-border)] text-[15px] font-bold text-white/50 transition hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogout}
                  className="h-[52px] rounded-2xl bg-[#7C4FF0] text-[15px] font-bold text-white shadow-lg shadow-[#7C4FF0]/20 transition hover:bg-[#8B5CF6]"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
