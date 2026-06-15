"use client";

import { useEffect, useCallback, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import {
  refreshSocketAuth,
  socket,
} from "./socket";
import { SOCKET_EVENTS } from "./socket-events";

import {
  Message,
  useSocketStore,
} from "@/store/socket-store";
import {
  mergeMessageIntoQueryCache,
  updateMessageStatusInQueryCache,
} from "@/lib/message-query-cache";
import type { MessageQueryCache } from "@/lib/message-query-cache";
import {
  removeConversationFromQueryCache,
  updateConversationInQueryCache,
} from "@/lib/conversation-query-cache";
import type { ConversationQueryCache } from "@/lib/conversation-query-cache";
import type { Conversation } from "@/types/conversation";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import { queryKeys } from "@/lib/query-keys";
import { clearClientSession } from "@/lib/session-cleanup";
import { getServerNow } from "@/lib/server-time";
import { tokenStorage } from "@/lib/token";
import { useNotificationStore } from "@/store/notification-store";
import {
  useCallStore,
  type CallSession,
} from "@/store/call-store";
import type { Story } from "@/types/story";

type MessageReceipt = {
  messageId: string;
  serverId?: string;
  status?: "sent" | "delivered" | "read";
};

type TypingUsersPayload =
  | string[]
  | {
      conversationId?: string;
      users?: string[];
    };

type ConversationErrorPayload = {
  conversationId?: string;
  message?: string;
};

type ConversationUpdatedPayload = {
  conversationId?: string;
  messageId?: string;
  latestMessage?: string;
  senderId?: string;
  createdAt?: string;
};

type ConversationArchiveUpdatedPayload = {
  conversationId?: string;
  archivedAt?: string | null;
};

type ConversationDeletedPayload = {
  conversationId?: string;
  hiddenAt?: string;
};

type ConversationThemeUpdatedPayload = {
  conversationId?: string;
  scope?: "me" | "both";
  themeId?: string | null;
  updatedAt?: string;
};

type ConversationSettingsUpdatedPayload = {
  conversationId?: string;
  pinned?: boolean;
  pinnedAt?: string | null;
  muted?: boolean;
  mutedAt?: string | null;
  folder?: Conversation["folder"];
};

type ConversationReadUpdatedPayload = {
  conversationId?: string;
  unreadCount?: number;
};

type PresenceUpdatedPayload = {
  userId?: string;
  status?: "online" | "offline";
  lastSeenAt?: string | number;
};

type StoryViewedPayload = {
  storyId?: string;
  viewerId?: string;
  viewedAt?: string;
};

type StoryDeletedPayload = {
  storyId?: string;
  deletedAt?: string;
};

type StoryExpiredPayload = {
  storyIds?: string[];
  expiredAt?: string;
};

type AccountDeletedPayload = {
  userId?: string;
  deletedAt?: string;
};

type UserUpdatedPayload = {
  user?: {
    id?: string;
    username?: string;
    email?: string;
    avatar?: string | null;
  };
};

type DiscoverUserDismissedPayload = {
  userId?: string;
};

type CallLifecyclePayload = {
  callId?: string;
  reason?: string;
};

type CallSignalRelayPayload = {
  callId?: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type CallErrorPayload = {
  callId?: string;
  message?: string;
};

const CONVERSATION_UPDATE_DEDUPE_TTL_MS =
  2 * 60 * 1000;
const STORY_EVENT_DEDUPE_TTL_MS = 10_000;
const PENDING_NOTIFICATION_CONVERSATION_KEY =
  "flexchat:pending-conversation";

const recentConversationUpdates = new Map<
  string,
  number
>();
const recentStoryEvents = new Map<string, number>();

function getConversationNameFromCache(
  cache: ConversationQueryCache,
  conversationId: string
) {
  if (!cache) {
    return "New message";
  }

  const conversations =
    Array.isArray(cache)
      ? cache
      : "pages" in cache
        ? cache.pages.flatMap(
            (page) =>
              page.conversations
          )
        : [];

  return (
    conversations.find(
      (conversation) =>
        conversation.id === conversationId
    )?.name ?? "New message"
  );
}

function hasConversationInCache(
  cache: ConversationQueryCache,
  conversationId: string
) {
  if (!cache) {
    return false;
  }

  const conversations =
    Array.isArray(cache)
      ? cache
      : "pages" in cache
        ? cache.pages.flatMap(
            (page) =>
              page.conversations
          )
        : [];

  return conversations.some(
    (conversation) =>
      conversation.id === conversationId
  );
}

function hasSeenConversationUpdate(
  messageId?: string
) {
  if (!messageId) {
    return false;
  }

  const now = Date.now();

  recentConversationUpdates.forEach(
    (expiresAt, key) => {
      if (expiresAt <= now) {
        recentConversationUpdates.delete(key);
      }
    }
  );

  if (recentConversationUpdates.has(messageId)) {
    return true;
  }

  recentConversationUpdates.set(
    messageId,
    now + CONVERSATION_UPDATE_DEDUPE_TTL_MS
  );

  return false;
}

function hasSeenStoryEvent(storyId: string) {
  const now = Date.now();

  recentStoryEvents.forEach((expiresAt, key) => {
    if (expiresAt <= now) {
      recentStoryEvents.delete(key);
    }
  });

  if (recentStoryEvents.has(storyId)) {
    return true;
  }

  recentStoryEvents.set(storyId, now + STORY_EVENT_DEDUPE_TTL_MS);

  return false;
}

function getMessagePreview(message: Message) {
  const body =
    message.deletedAt
      ? "Message deleted"
      : message.text?.trim() ||
        (message.audio
        ? "Voice message"
        : message.attachment
            ? /\.(png|jpe?g|gif|webp|avif|heic|heif)(\?|$)/i.test(message.attachment)
              ? "Photo"
              : /\.(mp4|webm|ogg|mov|m4v|3gp|3gpp|3g2|3gpp2)(\?|$)/i.test(message.attachment)
                ? "Video"
                : "File"
            : "New message");

  return message.forwardedFrom
    ? `Forwarded: ${body}`
    : body;
}

function openConversationFromNotification(conversationId: string) {
  try {
    window.sessionStorage.setItem(
      PENDING_NOTIFICATION_CONVERSATION_KEY,
      conversationId,
    );
  } catch {
    // Session storage is best-effort; Zustand still opens the chat in-session.
  }

  useConversationStore.setState({
    activeConversationId: conversationId,
  });

  window.dispatchEvent(new CustomEvent("flexchat:conversation-selected"));

  if (!window.location.pathname.includes("/chat")) {
    window.location.assign("/chat");
  } else {
    window.focus();
  }
}

async function showIncomingMessageNotification(input: {
  id: string;
  title: string;
  message: string;
  conversationId: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (
    (document.visibilityState === "visible" && document.hasFocus()) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const notification = new Notification(input.title, {
    body: input.message,
    tag: `flexchat-message-${input.conversationId}`,
    silent: false,
  });

  notification.onclick = () => {
    notification.close();
    openConversationFromNotification(input.conversationId);
  };
}

function addCallNotification(input: {
  id: string;
  title: string;
  message: string;
  kind: "call" | "missed_call" | "call_accepted" | "call_rejected";
}) {
  useNotificationStore.getState().addNotification({
    id: input.id,
    title: input.title,
    message: input.message,
    kind: input.kind,
    createdAt: new Date(getServerNow()).toISOString(),
    read: false,
  });
}

function guardSocketHandler<Arguments extends unknown[]>(
  eventName: string,
  handler: (...args: Arguments) => void,
) {
  return (...args: Arguments) => {
    try {
      // TEMPORARY INSTRUMENTATION - Finding exact exception
      console.log(`[SOCKET] Entering handler: ${eventName}`, { argsCount: args.length, args: JSON.stringify(args).substring(0, 500) });
      handler(...args);
      console.log(`[SOCKET] Handler completed successfully: ${eventName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error(
        `[SOCKET] Socket handler FAILED for ${eventName}`,
        {
          errorMessage: errorMsg,
          errorStack: errorStack,
          errorType: error?.constructor?.name,
          args: JSON.stringify(args).substring(0, 1000),
        }
      );
      // Re-throw to let it bubble to error boundary if it's a critical error
      // throw error;
    }
  };
}

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const setOnlineUsers = useSocketStore(
    (state) => state.setOnlineUsers
  );
  const addMessage = useSocketStore(
    (state) => state.addMessage
  );
  const setTypingUsers = useSocketStore(
    (state) => state.setTypingUsers
  );
  const updateMessageStatus = useSocketStore(
    (state) => state.updateMessageStatus
  );
  const setConnectionError = useSocketStore(
    (state) => state.setConnectionError
  );
  const resetPendingMessageFlights = useSocketStore(
    (state) => state.resetPendingMessageFlights
  );
  const updateConversationMessage = useConversationStore(
    (state) => state.updateConversationMessage
  );

  const presenceUpdateBuffer = useRef<Map<string, { status: "online" | "offline"; lastSeenAt?: string | number }>>(new Map());
  const presenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPresence = useCallback(() => {
    if (presenceUpdateBuffer.current.size === 0) return;

    const updates = Array.from(presenceUpdateBuffer.current.entries());
    presenceUpdateBuffer.current.clear();

    useSocketStore.setState((state) => {
      const users = new Set(state.onlineUsers);
      updates.forEach(([userId, update]: [string, { status: string }]) => {
        if (update.status === "online") {
          users.add(userId);
        } else {
          users.delete(userId);
        }
      });
      return {
        onlineUsers: Array.from(users).filter(Boolean).sort(),
      };
    });

    queryClient.setQueryData<ConversationQueryCache>(
      queryKeys.conversations.all,
      (cache) => {
        if (!cache) return cache;

        const updateMembers = (conversation: Conversation): Conversation => {
          let changed = false;
          const nextMembers = conversation.members?.map((member) => {
            const updateEntry = updates.find(([id]) => id === member.id);
            if (updateEntry && updateEntry[1].lastSeenAt) {
              changed = true;
              return {
                ...member,
                lastSeenAt: updateEntry[1].lastSeenAt,
              };
            }
            return member;
          }) ?? conversation.members;

          return changed ? { ...conversation, members: nextMembers } : conversation;
        };

        if (Array.isArray(cache)) {
          return cache.map(updateMembers);
        }

        if ("pages" in cache) {
          return {
            ...cache,
            pages: cache.pages.map((page) => ({
              ...page,
              conversations: page.conversations.map(updateMembers),
            })),
          };
        }

        return cache;
      }
    );
  }, [queryClient]);

  const typingUpdateBuffer = useRef<string[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushTyping = useCallback(() => {
    if (typingUpdateBuffer.current.length === 0) return;
    const users = [...typingUpdateBuffer.current];
    typingUpdateBuffer.current = [];
    setTypingUsers(users);
  }, [setTypingUsers]);

  useEffect(() => {
    function onConnect() {
      const latestToken = refreshSocketAuth("connect");

      console.info("[SOCKET] connected", {
        socketId: socket.id,
        hasToken: Boolean(latestToken),
        recovered: socket.recovered,
        transport: socket.io.engine?.transport?.name ?? "unknown",
      });

      useSocketStore.setState((state) => ({
        token: latestToken ?? state.token,
        isConnected: true,
        isConnecting: false,
        connectionVersion:
          state.connectionVersion + 1,
        connectionError: null,
      }));

      const socketState =
        useSocketStore.getState();

      socketState.rejoinActiveConversation();
      socketState.flushPendingMessages();

      if (useCallStore.getState().currentCall) {
        useCallStore.setState({
          networkState: "connecting",
          error: null,
        });
      }

      void queryClient.refetchQueries({
        queryKey:
          queryKeys.conversations.all,
      });
      void queryClient.refetchQueries({
        queryKey:
          queryKeys.stories.all,
      });

      if (socketState.activeConversationId) {
        void queryClient.refetchQueries({
          queryKey:
            queryKeys.messages.list(
              socketState.activeConversationId
            ),
        });
      }
    }

    function onDisconnect(reason?: string) {
      console.warn("[SOCKET] disconnected", {
        reason: reason ?? "unknown",
        hasToken: tokenStorage.exists(),
      });
      resetPendingMessageFlights();

      if (useCallStore.getState().currentCall) {
        useCallStore.setState({
          networkState: "reconnecting",
        });
      }

      useSocketStore.setState({
        isConnected: false,
        isConnecting: false,
        typingUsers: [],
      });

      if (
        reason === "io server disconnect" &&
        tokenStorage.exists()
      ) {
        window.setTimeout(() => {
          const token = tokenStorage.get();

          if (!token || socket.connected || socket.active) {
            return;
          }

          console.info("[SOCKET] reconnecting after server disconnect", {
            hasToken: true,
          });
          useSocketStore.getState().connectSocket(token);
        }, 750);
      }
    }

    function onConnectError(error: Error) {
      console.error("[SOCKET] connection rejected reason", {
        message: error.message,
        transport: socket.io.engine?.transport?.name ?? "none",
        url: (socket.io as unknown as { uri?: string }).uri,
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
        hasToken: tokenStorage.exists(),
      });

      useSocketStore.setState({
        isConnecting: false,
        connectionError: error.message,
      });

      const msg = error.message.toLowerCase();
      if (msg.includes("unauthorized") && !msg.includes("unavailable")) {
        clearClientSession();
      }
    }

    function onOnlineUsers(users: string[]) {
      setOnlineUsers(users);
    }

    function onPresenceUpdated(
      payload: PresenceUpdatedPayload
    ) {
      if (!payload.userId || !payload.status) {
        return;
      }

      presenceUpdateBuffer.current.set(payload.userId, {
        status: payload.status,
        lastSeenAt: payload.lastSeenAt,
      });

      if (presenceTimer.current) {
        clearTimeout(presenceTimer.current);
      }

      presenceTimer.current = setTimeout(() => {
        flushPresence();
      }, 350);
    }

    function onReceiveMessage(message: Message) {
      const currentUserId =
        useAuthStore.getState().user?.id;
      const activeConversationId =
        useConversationStore.getState()
          .activeConversationId;
      const isRemoteMessage =
        message.senderId !== "me" &&
        message.senderId !== currentUserId;

      queryClient.setQueryData<MessageQueryCache>(
        queryKeys.messages.list(
          message.conversationId
        ),
        (cache) =>
          mergeMessageIntoQueryCache(cache, message)
      );

      addMessage(message);
      const latestMessage =
        getMessagePreview(message);

      updateConversationMessage(
        message.conversationId,
        latestMessage,
        {
          unread:
            isRemoteMessage &&
            activeConversationId !==
              message.conversationId,
        }
      );

      if (
        socket.connected &&
        isRemoteMessage
      ) {
        socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
          messageId: message.id,
          conversationId: message.conversationId,
        });
      }
    }

    function mergeRealtimeMessage(message: Message) {
      queryClient.setQueryData<MessageQueryCache>(
        queryKeys.messages.list(
          message.conversationId
        ),
        (cache) =>
          mergeMessageIntoQueryCache(cache, message)
      );

      addMessage(message);
    }

    function onConversationUpdated(
      payload: ConversationUpdatedPayload
    ) {
      if (
        !payload.conversationId ||
        !payload.messageId
      ) {
        return;
      }

      if (
        hasSeenConversationUpdate(
          payload.messageId
        )
      ) {
        return;
      }

      const currentUserId =
        useAuthStore.getState().user?.id;
      const activeConversationId =
        useConversationStore.getState()
          .activeConversationId;
      const latestMessage =
        payload.latestMessage ?? "";
      const isRemoteMessage =
        !!payload.senderId &&
        payload.senderId !== currentUserId;
      const conversationIsActive =
        activeConversationId ===
        payload.conversationId;
      const shouldIncrementUnread =
        isRemoteMessage &&
        !conversationIsActive;
      const conversationName =
        getConversationNameFromCache(
          queryClient.getQueryData<ConversationQueryCache>(
            queryKeys.conversations.all
          ),
          payload.conversationId
        );
      const conversationWasCached =
        hasConversationInCache(
          queryClient.getQueryData<ConversationQueryCache>(
            queryKeys.conversations.all
          ),
          payload.conversationId
        );
      let nextUnreadCount:
        | number
        | undefined;

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          updateConversationInQueryCache(
            cache,
            payload.conversationId ?? "",
            (conversation) => {
            nextUnreadCount =
              conversationIsActive
                ? 0
                : shouldIncrementUnread
                  ? (conversation.unreadCount ?? 0) + 1
                  : conversation.unreadCount;

            return {
              ...conversation,
              latestMessage,
              unreadCount:
                nextUnreadCount,
              lastActivityAt:
                payload.createdAt ??
                conversation.lastActivityAt,
            };
            }
          )
      );

      updateConversationMessage(
        payload.conversationId,
        latestMessage,
        {
          unread:
            shouldIncrementUnread,
          unreadCount:
            nextUnreadCount,
        }
      );

      if (shouldIncrementUnread) {
        void showIncomingMessageNotification({
          id: payload.messageId,
          title: conversationName,
          message: latestMessage || "New message",
          conversationId: payload.conversationId,
        });
      }

      if (!conversationWasCached) {
        void queryClient.invalidateQueries({
          queryKey:
            queryKeys.conversations.all,
        });
      }
    }

    function onTypingUsers(payload: TypingUsersPayload) {
      const activeConversationId =
        useSocketStore.getState().activeConversationId;

      let users: string[] = [];
      if (Array.isArray(payload)) {
        users = payload;
      } else if (
        payload.conversationId &&
        payload.conversationId === activeConversationId
      ) {
        users = payload.users ?? [];
      } else {
        return;
      }

      typingUpdateBuffer.current = users;

      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }

      typingTimer.current = setTimeout(() => {
        flushTyping();
      }, 150);
    }

    function onMessageDelivered(receipt: MessageReceipt) {
      queryClient.setQueriesData<MessageQueryCache>(
        {
          queryKey: ["messages"],
        },
        (cache) =>
          updateMessageStatusInQueryCache(
            cache,
            receipt,
            "delivered"
          )
      );

      updateMessageStatus(
        receipt.messageId,
        receipt.status ?? "delivered",
        receipt.serverId
      );
    }

    function onMessageSeen(receipt: MessageReceipt) {
      queryClient.setQueriesData<MessageQueryCache>(
        {
          queryKey: ["messages"],
        },
        (cache) =>
          updateMessageStatusInQueryCache(
            cache,
            receipt,
            "read"
          )
      );

      updateMessageStatus(
        receipt.messageId,
        "read",
        receipt.serverId
      );
    }

    function onConversationError(
      payload: ConversationErrorPayload
    ) {
      const activeConversationId =
        useSocketStore.getState().activeConversationId;

      if (
        payload.conversationId &&
        payload.conversationId === activeConversationId
      ) {
        setTypingUsers([]);
      }

      setConnectionError(
        payload.message ??
          "Conversation unavailable"
      );
    }

    function onConversationArchiveUpdated(
      payload: ConversationArchiveUpdatedPayload
    ) {
      if (!payload.conversationId) {
        return;
      }

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          updateConversationInQueryCache(
            cache,
            payload.conversationId ?? "",
            (conversation) => ({
              ...conversation,
              archivedAt:
                payload.archivedAt ?? null,
            })
          )
      );

      useConversationStore.setState((state) => ({
        conversationPatches: {
          ...state.conversationPatches,
          [payload.conversationId ?? ""]: {
            ...state.conversationPatches[
              payload.conversationId ?? ""
            ],
            archivedAt:
              payload.archivedAt ?? null,
          },
        },
      }));
    }

    function onConversationDeleted(
      payload: ConversationDeletedPayload
    ) {
      if (!payload.conversationId) {
        return;
      }

      const conversationId =
        payload.conversationId;

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          removeConversationFromQueryCache(
            cache,
            conversationId
          )
      );

      useConversationStore.setState((state) => {
        const conversationPatches = {
          ...state.conversationPatches,
        };

        delete conversationPatches[conversationId];

        return {
          activeConversationId:
            state.activeConversationId === conversationId
              ? null
              : state.activeConversationId,
          conversationPatches,
        };
      });
    }

    function onConversationThemeUpdated(
      payload: ConversationThemeUpdatedPayload
    ) {
      if (!payload.conversationId) {
        return;
      }

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          updateConversationInQueryCache(
            cache,
            payload.conversationId ?? "",
            (conversation) => ({
              ...conversation,
              localThemeId:
                payload.scope === "me"
                  ? payload.themeId ?? null
                  : payload.scope === "both"
                    ? null
                  : conversation.localThemeId,
              sharedThemeId:
                payload.scope === "both"
                  ? payload.themeId ?? null
                  : conversation.sharedThemeId,
              themeUpdatedAt:
                payload.updatedAt ?? conversation.themeUpdatedAt,
            })
          )
      );

      useConversationStore.setState((state) => ({
        conversationPatches: {
          ...state.conversationPatches,
          [payload.conversationId ?? ""]: {
            ...state.conversationPatches[
              payload.conversationId ?? ""
            ],
            ...(payload.scope === "me"
              ? {
                  localThemeId:
                    payload.themeId ?? null,
                }
              : {
                  localThemeId: null,
                  sharedThemeId:
                    payload.themeId ?? null,
                }),
            themeUpdatedAt:
              payload.updatedAt ??
              new Date(getServerNow()).toISOString(),
          },
        },
      }));
    }

    function onConversationSettingsUpdated(
      payload: ConversationSettingsUpdatedPayload
    ) {
      if (!payload.conversationId) {
        return;
      }

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          updateConversationInQueryCache(
            cache,
            payload.conversationId ?? "",
            (conversation) => ({
              ...conversation,
              pinned:
                payload.pinned ?? conversation.pinned,
              pinnedAt:
                payload.pinnedAt ?? null,
              muted:
                payload.muted ?? conversation.muted,
              mutedAt:
                payload.mutedAt ?? null,
              folder:
                payload.folder ?? null,
            })
          )
      );

      useConversationStore.setState((state) => ({
        conversationPatches: {
          ...state.conversationPatches,
          [payload.conversationId ?? ""]: {
            ...state.conversationPatches[
              payload.conversationId ?? ""
            ],
            pinned:
              payload.pinned,
            pinnedAt:
              payload.pinnedAt ?? null,
            muted:
              payload.muted,
            mutedAt:
              payload.mutedAt ?? null,
            folder:
              payload.folder ?? null,
          },
        },
      }));
    }

    function onConversationReadUpdated(
      payload: ConversationReadUpdatedPayload
    ) {
      if (!payload.conversationId) {
        return;
      }

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          updateConversationInQueryCache(
            cache,
            payload.conversationId ?? "",
            (conversation) => ({
              ...conversation,
              unreadCount:
                payload.unreadCount ?? conversation.unreadCount,
            })
          )
      );

      useConversationStore.setState((state) => ({
        conversationPatches: {
          ...state.conversationPatches,
          [payload.conversationId ?? ""]: {
            ...state.conversationPatches[
              payload.conversationId ?? ""
            ],
            unreadCount:
              payload.unreadCount ?? 0,
          },
        },
      }));
    }

    function onStoryCreated(story: Story) {
      // TEMPORARY INSTRUMENTATION - Finding exact exception
      console.log('[SOCKET] onStoryCreated called with:', { storyId: story?.id, storyUserId: story?.userId });
      
      if (!story?.id || hasSeenStoryEvent(story.id)) {
        console.log('[SOCKET] onStoryCreated - missing id or already seen, returning');
        return;
      }

      try {
        const currentUserId =
          useAuthStore.getState().user?.id;
        console.log('[SOCKET] onStoryCreated - auth user:', { userId: currentUserId });

        queryClient.setQueryData<Story[]>(
          queryKeys.stories.all,
          (stories) => {
            console.log('[SOCKET] onStoryCreated - updating cache, old stories:', { count: stories?.length });
            const filteredStories =
              (stories ?? []).filter((item) => {
                if (item.id === story.id) {
                  return false;
                }

                return !(
                  story.userId === currentUserId &&
                  item.id.startsWith("optimistic-story-")
                );
              });
            
            const result = [
              story,
              ...filteredStories,
            ];
            console.log('[SOCKET] onStoryCreated - cache updated, new count:', { count: result.length });
            return result;
          }
        );
        console.log('[SOCKET] onStoryCreated - completed successfully');
      } catch (error) {
        console.error('[SOCKET] onStoryCreated - caught exception:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : '',
          storyId: story?.id,
        });
        throw error;
      }
    }

    function onStoryViewed(
      payload: StoryViewedPayload
    ) {
      // TEMPORARY INSTRUMENTATION - Finding exact exception
      console.log('[SOCKET] onStoryViewed called with:', { payload });
      
      if (!payload.storyId) {
        console.log('[SOCKET] onStoryViewed - no storyId, returning');
        return;
      }

      try {
        console.log('[SOCKET] onStoryViewed - getting stories from cache');
        const currentStories = queryClient.getQueryData<Story[]>(queryKeys.stories.all);
        console.log('[SOCKET] onStoryViewed - current stories:', { count: currentStories?.length, stories: JSON.stringify(currentStories).substring(0, 500) });
        
        const authUser = useAuthStore.getState().user;
        console.log('[SOCKET] onStoryViewed - auth user:', { userId: authUser?.id });

        queryClient.setQueryData<Story[]>(
          queryKeys.stories.all,
          (stories) => {
            console.log('[SOCKET] onStoryViewed - updating cache, old stories:', { count: stories?.length });
            const updated = stories?.map((story) => {
              console.log('[SOCKET] onStoryViewed - processing story:', { id: story.id, matches: story.id === payload.storyId });
              if (story.id === payload.storyId) {
                const oldViewCount = story.viewCount;
                const newViewed = payload.viewerId === authUser?.id ? true : story.viewed;
                const newViewCount = 
                  payload.viewerId &&
                  payload.viewerId !== story.userId &&
                  payload.viewerId !== authUser?.id
                    ? (story.viewCount ?? 0) + 1
                    : story.viewCount;
                console.log('[SOCKET] onStoryViewed - updating story:', { oldViewCount, newViewCount, oldViewed: story.viewed, newViewed });
                return {
                  ...story,
                  viewed: newViewed,
                  viewCount: newViewCount,
                };
              }
              return story;
            }) ?? [];
            console.log('[SOCKET] onStoryViewed - cache updated, new count:', { count: updated.length });
            return updated;
          }
        );

        console.log('[SOCKET] onStoryViewed - invalidating queries');
        void queryClient.invalidateQueries({
          queryKey: [
            ...queryKeys.stories.all,
            payload.storyId,
            "viewers",
          ],
        });
        console.log('[SOCKET] onStoryViewed - completed successfully');
      } catch (error) {
        console.error('[SOCKET] onStoryViewed - caught exception:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : '',
          payload,
        });
        throw error;
      }
    }

    function onStoryPrivacyUpdated(story: Story) {
      // TEMPORARY INSTRUMENTATION - Finding exact exception
      console.log('[SOCKET] onStoryPrivacyUpdated called with:', { storyId: story?.id });
      
      if (!story?.id) {
        console.log('[SOCKET] onStoryPrivacyUpdated - no id, returning');
        return;
      }

      try {
        queryClient.setQueryData<Story[]>(
          queryKeys.stories.all,
          (stories) => {
            console.log('[SOCKET] onStoryPrivacyUpdated - updating cache, old stories:', { count: stories?.length });
            const currentStories = stories ?? [];
            const hasStory = currentStories.some(
              (item) => item.id === story.id
            );

            const result = hasStory
              ? currentStories.map((item) =>
                  item.id === story.id ? story : item
                )
              : [story, ...currentStories];
            console.log('[SOCKET] onStoryPrivacyUpdated - cache updated, new count:', { count: result.length });
            return result;
          }
        );
        console.log('[SOCKET] onStoryPrivacyUpdated - completed successfully');
      } catch (error) {
        console.error('[SOCKET] onStoryPrivacyUpdated - caught exception:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : '',
          storyId: story?.id,
        });
        throw error;
      }
    }

    function onStoryDeleted(
      payload: StoryDeletedPayload
    ) {
      if (!payload.storyId) {
        return;
      }

      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) =>
          (stories ?? []).filter(
            (story) =>
              story.id !== payload.storyId
          )
      );
    }

    function onStoryExpired(
      payload: StoryExpiredPayload
    ) {
      const storyIds = new Set(
        payload.storyIds?.filter(Boolean) ?? []
      );

      if (!storyIds.size) {
        void queryClient.invalidateQueries({
          queryKey:
            queryKeys.stories.all,
        });
        return;
      }

      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) =>
          (stories ?? []).filter(
            (story) =>
              !storyIds.has(story.id)
          )
      );
    }

    function onAccountDeleted(
      payload: AccountDeletedPayload
    ) {
      if (!payload.userId) {
        return;
      }

      const currentUserId =
        useAuthStore.getState().user?.id;

      if (payload.userId === currentUserId) {
        clearClientSession();
        return;
      }

      useSocketStore.setState((state) => ({
        onlineUsers:
          state.onlineUsers.filter(
            (userId) =>
              userId !== payload.userId
          ),
        typingUsers:
          state.typingUsers.filter(
            (userId) =>
              userId !== payload.userId
          ),
      }));
      useNotificationStore
        .getState()
        .clearNotifications();

      void queryClient.invalidateQueries({
        queryKey:
          queryKeys.conversations.all,
      });
      void queryClient.invalidateQueries({
        queryKey:
          queryKeys.stories.all,
      });
      void queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    }

    function onUserUpdated(
      payload: UserUpdatedPayload
    ) {
      const updatedUser =
        payload.user;

      if (
        !updatedUser?.id ||
        !updatedUser.username
      ) {
        return;
      }

      const updatedUserId = updatedUser.id;
      const updatedUsername = updatedUser.username;
      const updatedAvatar = updatedUser.avatar ?? null;

      const publicUpdate = {
        id: updatedUserId,
        username: updatedUsername,
        avatar: updatedAvatar,
      };

      if (
        updatedUserId ===
        useAuthStore.getState().user?.id
      ) {
        useAuthStore
          .getState()
          .updateUser({
            ...publicUpdate,
            email: updatedUser.email,
          });

        void queryClient.invalidateQueries({
          queryKey: queryKeys.auth.me,
        });
      }

      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) =>
          stories?.map((story) =>
            story.userId === updatedUserId
              ? {
                  ...story,
                  user: {
                    ...story.user,
                    username: updatedUsername,
                    avatar: updatedAvatar,
                  },
                }
              : story
          ) ?? []
      );

      queryClient.setQueriesData<
        {
          id: string;
          username: string;
          avatar?: string | null;
        }[]
      >(
        {
          queryKey: ["users"],
        },
        (users) =>
          users?.map((user) =>
            user.id === updatedUserId
              ? {
                  ...user,
                  username: updatedUsername,
                  avatar: updatedAvatar,
                }
              : user
          ) ?? users
      );

      void queryClient.invalidateQueries({
        queryKey:
          queryKeys.conversations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    }

    function onDiscoverUserDismissed(
      payload: DiscoverUserDismissedPayload
    ) {
      if (!payload.userId) {
        return;
      }

      queryClient.setQueriesData<
        {
          id: string;
          username: string;
          avatar?: string | null;
        }[]
      >(
        {
          queryKey: [
            "users",
            "discover",
          ],
        },
        (users) =>
          users?.filter(
            (user) =>
              user.id !== payload.userId
          ) ?? users
      );
    }

    function onCallIncoming(
      call: CallSession
    ) {
      addCallNotification({
        id: `call-incoming-${call.id}`,
        title: call.kind === "video" ? "Incoming video call" : "Incoming call",
        message: "Tap the call screen to answer or decline.",
        kind: "call",
      });
      useCallStore
        .getState()
        .handleIncomingCall(call);
    }

    function onCallAccepted(
      call: CallSession
    ) {
      addCallNotification({
        id: `call-accepted-${call.id}`,
        title: call.kind === "video" ? "Video call accepted" : "Call accepted",
        message: "The call is connecting.",
        kind: "call_accepted",
      });
      useCallStore
        .getState()
        .handleCallAccepted(call);
    }

    function onCallRejected(
      payload: CallLifecyclePayload
    ) {
      if (payload.callId) {
        addCallNotification({
          id: `call-rejected-${payload.callId}`,
          title: "Call rejected",
          message: "The call was declined.",
          kind: "call_rejected",
        });
      }
      useCallStore
        .getState()
        .handleCallRejected(payload);
    }

    function onCallCanceled(
      payload: CallLifecyclePayload
    ) {
      useCallStore
        .getState()
        .handleCallCanceled(payload);
    }

    function onCallEnded(
      payload: CallLifecyclePayload
    ) {
      if (
        payload.callId &&
        (payload.reason === "missed" ||
          payload.reason === "unreachable" ||
          payload.reason === "participant_disconnected")
      ) {
        addCallNotification({
          id: `call-ended-${payload.callId}-${payload.reason}`,
          title: payload.reason === "missed" ? "Missed call" : "Call ended",
          message:
            payload.reason === "unreachable"
              ? "The other person was unreachable."
              : payload.reason === "participant_disconnected"
                ? "The call disconnected."
                : "You missed a call.",
          kind: "missed_call",
        });
      }
      useCallStore
        .getState()
        .handleCallEnded(payload);
    }

    function onCallSignalRelay(
      type: "offer" | "answer" | "candidate",
      payload: CallSignalRelayPayload
    ) {
      useCallStore
        .getState()
        .handleCallSignal({
          callId: payload.callId,
          signal: {
            type,
            description: payload.description,
            candidate: payload.candidate,
          },
        });
    }

    function onCallOffer(payload: CallSignalRelayPayload) {
      onCallSignalRelay("offer", payload);
    }

    function onCallAnswer(payload: CallSignalRelayPayload) {
      onCallSignalRelay("answer", payload);
    }

    function onCallIceCandidate(payload: CallSignalRelayPayload) {
      onCallSignalRelay("candidate", payload);
    }

    function onCallError(
      payload: CallErrorPayload
    ) {
      useCallStore
        .getState()
        .handleCallError(payload);
    }

    function handleOffline() {
      console.warn("[SOCKET] browser went offline", {
        connected: socket.connected,
        active: socket.active,
      });
      resetPendingMessageFlights();
      useSocketStore.setState({
        isConnected: false,
        isConnecting: false,
        typingUsers: [],
      });
    }

    function onReconnectAttempt() {
      useSocketStore.setState({
        isConnected: false,
        isConnecting: true,
        connectionError: null,
      });
    }

    function onReconnectError(error: Error) {
      useSocketStore.setState({
        isConnected: false,
        isConnecting: true,
        connectionError: error.message,
      });
    }

    function onReconnectFailed() {
      useSocketStore.setState({
        isConnected: false,
        isConnecting: false,
        connectionError: "Unable to reconnect",
      });
    }

    const safeOnConnect = guardSocketHandler(
      SOCKET_EVENTS.CONNECT,
      onConnect,
    );
    const safeOnDisconnect = guardSocketHandler(
      SOCKET_EVENTS.DISCONNECT,
      onDisconnect,
    );
    const safeOnConnectError = guardSocketHandler(
      SOCKET_EVENTS.CONNECT_ERROR,
      onConnectError,
    );
    const safeOnOnlineUsers = guardSocketHandler(
      SOCKET_EVENTS.ONLINE_USERS,
      onOnlineUsers,
    );
    const safeOnPresenceUpdated = guardSocketHandler(
      SOCKET_EVENTS.PRESENCE_UPDATED,
      onPresenceUpdated,
    );
    const safeOnReceiveMessage = guardSocketHandler(
      SOCKET_EVENTS.RECEIVE_MESSAGE,
      onReceiveMessage,
    );
    const safeMergeRealtimeMessage = guardSocketHandler(
      "message mutation",
      mergeRealtimeMessage,
    );
    const safeOnConversationUpdated = guardSocketHandler(
      SOCKET_EVENTS.CONVERSATION_UPDATED,
      onConversationUpdated,
    );
    const safeOnTypingUsers = guardSocketHandler(
      SOCKET_EVENTS.TYPING_USERS,
      onTypingUsers,
    );
    const safeOnMessageDelivered = guardSocketHandler(
      SOCKET_EVENTS.MESSAGE_DELIVERED,
      onMessageDelivered,
    );
    const safeOnMessageSeen = guardSocketHandler(
      SOCKET_EVENTS.MESSAGE_SEEN,
      onMessageSeen,
    );
    const safeOnConversationError = guardSocketHandler(
      SOCKET_EVENTS.CONVERSATION_ERROR,
      onConversationError,
    );
    const safeOnConversationArchiveUpdated = guardSocketHandler(
      SOCKET_EVENTS.CONVERSATION_ARCHIVE_UPDATED,
      onConversationArchiveUpdated,
    );
    const safeOnConversationDeleted = guardSocketHandler(
      SOCKET_EVENTS.CONVERSATION_DELETED,
      onConversationDeleted,
    );
    const safeOnConversationThemeUpdated = guardSocketHandler(
      SOCKET_EVENTS.CONVERSATION_THEME_UPDATED,
      onConversationThemeUpdated,
    );
    const safeOnConversationSettingsUpdated = guardSocketHandler(
      SOCKET_EVENTS.CONVERSATION_SETTINGS_UPDATED,
      onConversationSettingsUpdated,
    );
    const safeOnConversationReadUpdated = guardSocketHandler(
      SOCKET_EVENTS.CONVERSATION_READ_UPDATED,
      onConversationReadUpdated,
    );
    const safeOnStoryCreated = guardSocketHandler(
      SOCKET_EVENTS.STORY_CREATED,
      onStoryCreated,
    );
    const safeOnStoryNew = guardSocketHandler(
      SOCKET_EVENTS.STORY_NEW,
      onStoryCreated,
    );
    const safeOnStoryPrivacyUpdated = guardSocketHandler(
      SOCKET_EVENTS.STORY_PRIVACY_UPDATED,
      onStoryPrivacyUpdated,
    );
    const safeOnStoryViewed = guardSocketHandler(
      SOCKET_EVENTS.STORY_VIEWED,
      onStoryViewed,
    );
    const safeOnStoryDeleted = guardSocketHandler(
      SOCKET_EVENTS.STORY_DELETED,
      onStoryDeleted,
    );
    const safeOnStoryExpired = guardSocketHandler(
      SOCKET_EVENTS.STORY_EXPIRED,
      onStoryExpired,
    );
    const safeOnAccountDeleted = guardSocketHandler(
      SOCKET_EVENTS.ACCOUNT_DELETED,
      onAccountDeleted,
    );
    const safeOnUserUpdated = guardSocketHandler(
      SOCKET_EVENTS.USER_UPDATED,
      onUserUpdated,
    );
    const safeOnDiscoverUserDismissed = guardSocketHandler(
      SOCKET_EVENTS.DISCOVER_USER_DISMISSED,
      onDiscoverUserDismissed,
    );
    const safeOnCallIncoming = guardSocketHandler(
      SOCKET_EVENTS.CALL_INCOMING,
      onCallIncoming,
    );
    const safeOnCallAccepted = guardSocketHandler(
      SOCKET_EVENTS.CALL_ACCEPTED,
      onCallAccepted,
    );
    const safeOnCallRejected = guardSocketHandler(
      SOCKET_EVENTS.CALL_REJECTED,
      onCallRejected,
    );
    const safeOnCallCanceled = guardSocketHandler(
      SOCKET_EVENTS.CALL_CANCELED,
      onCallCanceled,
    );
    const safeOnCallEnded = guardSocketHandler(
      SOCKET_EVENTS.CALL_ENDED,
      onCallEnded,
    );
    const safeOnCallOffer = guardSocketHandler(
      SOCKET_EVENTS.CALL_OFFER,
      onCallOffer,
    );
    const safeOnCallAnswer = guardSocketHandler(
      SOCKET_EVENTS.CALL_ANSWER,
      onCallAnswer,
    );
    const safeOnCallIceCandidate = guardSocketHandler(
      SOCKET_EVENTS.CALL_ICE_CANDIDATE,
      onCallIceCandidate,
    );
    const safeOnCallError = guardSocketHandler(
      SOCKET_EVENTS.CALL_ERROR,
      onCallError,
    );
    const safeOnReconnectAttempt = guardSocketHandler(
      "reconnect_attempt",
      onReconnectAttempt,
    );
    const safeOnReconnectError = guardSocketHandler(
      "reconnect_error",
      onReconnectError,
    );
    const safeOnReconnectFailed = guardSocketHandler(
      "reconnect_failed",
      onReconnectFailed,
    );

    socket.on(SOCKET_EVENTS.CONNECT, safeOnConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, safeOnDisconnect);
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, safeOnConnectError);
    socket.on(SOCKET_EVENTS.ONLINE_USERS, safeOnOnlineUsers);
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATED, safeOnPresenceUpdated);
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, safeOnReceiveMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, safeMergeRealtimeMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, safeMergeRealtimeMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, safeMergeRealtimeMessage);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, safeOnConversationUpdated);
    socket.on(SOCKET_EVENTS.TYPING_USERS, safeOnTypingUsers);
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, safeOnMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, safeOnMessageSeen);
    socket.on(SOCKET_EVENTS.CONVERSATION_ERROR, safeOnConversationError);
    socket.on(
      SOCKET_EVENTS.CONVERSATION_ARCHIVE_UPDATED,
      safeOnConversationArchiveUpdated
    );
    socket.on(
      SOCKET_EVENTS.CONVERSATION_DELETED,
      safeOnConversationDeleted
    );
    socket.on(
      SOCKET_EVENTS.CONVERSATION_THEME_UPDATED,
      safeOnConversationThemeUpdated
    );
    socket.on(
      SOCKET_EVENTS.CONVERSATION_SETTINGS_UPDATED,
      safeOnConversationSettingsUpdated
    );
    socket.on(
      SOCKET_EVENTS.CONVERSATION_READ_UPDATED,
      safeOnConversationReadUpdated
    );
    socket.on(SOCKET_EVENTS.STORY_CREATED, safeOnStoryCreated);
    socket.on(SOCKET_EVENTS.STORY_NEW, safeOnStoryNew);
    socket.on(
      SOCKET_EVENTS.STORY_PRIVACY_UPDATED,
      safeOnStoryPrivacyUpdated
    );
    socket.on(SOCKET_EVENTS.STORY_VIEWED, safeOnStoryViewed);
    socket.on(SOCKET_EVENTS.STORY_DELETED, safeOnStoryDeleted);
    socket.on(SOCKET_EVENTS.STORY_EXPIRED, safeOnStoryExpired);
    socket.on(SOCKET_EVENTS.ACCOUNT_DELETED, safeOnAccountDeleted);
    socket.on(SOCKET_EVENTS.USER_UPDATED, safeOnUserUpdated);
    socket.on(
      SOCKET_EVENTS.DISCOVER_USER_DISMISSED,
      safeOnDiscoverUserDismissed
    );
    socket.on(SOCKET_EVENTS.CALL_INCOMING, safeOnCallIncoming);
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, safeOnCallAccepted);
    socket.on(SOCKET_EVENTS.CALL_REJECTED, safeOnCallRejected);
    socket.on(SOCKET_EVENTS.CALL_CANCELED, safeOnCallCanceled);
    socket.on(SOCKET_EVENTS.CALL_ENDED, safeOnCallEnded);
    socket.on(SOCKET_EVENTS.CALL_OFFER, safeOnCallOffer);
    socket.on(SOCKET_EVENTS.CALL_ANSWER, safeOnCallAnswer);
    socket.on(SOCKET_EVENTS.CALL_ICE_CANDIDATE, safeOnCallIceCandidate);
    socket.on(SOCKET_EVENTS.CALL_ERROR, safeOnCallError);
    socket.io.on("reconnect_attempt", safeOnReconnectAttempt);
    socket.io.on("reconnect_error", safeOnReconnectError);
    socket.io.on("reconnect_failed", safeOnReconnectFailed);
    window.addEventListener("offline", handleOffline);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        const latestToken = tokenStorage.get();
        if (latestToken && !socket.connected && socket.active) {
          console.info("[SOCKET] app returned to foreground, forcing reconnect");
          socket.connect();
        }
      }
    }
    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, safeOnConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, safeOnDisconnect);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR, safeOnConnectError);
      socket.off(SOCKET_EVENTS.ONLINE_USERS, safeOnOnlineUsers);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATED, safeOnPresenceUpdated);
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, safeOnReceiveMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATED, safeMergeRealtimeMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, safeMergeRealtimeMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, safeMergeRealtimeMessage);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, safeOnConversationUpdated);
      socket.off(SOCKET_EVENTS.TYPING_USERS, safeOnTypingUsers);
      socket.off(SOCKET_EVENTS.MESSAGE_DELIVERED, safeOnMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE_SEEN, safeOnMessageSeen);
      socket.off(SOCKET_EVENTS.CONVERSATION_ERROR, safeOnConversationError);
      socket.off(
        SOCKET_EVENTS.CONVERSATION_ARCHIVE_UPDATED,
        safeOnConversationArchiveUpdated
      );
      socket.off(
        SOCKET_EVENTS.CONVERSATION_DELETED,
        safeOnConversationDeleted
      );
      socket.off(
        SOCKET_EVENTS.CONVERSATION_THEME_UPDATED,
        safeOnConversationThemeUpdated
      );
      socket.off(
        SOCKET_EVENTS.CONVERSATION_SETTINGS_UPDATED,
        safeOnConversationSettingsUpdated
      );
      socket.off(
        SOCKET_EVENTS.CONVERSATION_READ_UPDATED,
        safeOnConversationReadUpdated
      );
      socket.off(SOCKET_EVENTS.STORY_CREATED, safeOnStoryCreated);
      socket.off(SOCKET_EVENTS.STORY_NEW, safeOnStoryNew);
      socket.off(
        SOCKET_EVENTS.STORY_PRIVACY_UPDATED,
        safeOnStoryPrivacyUpdated
      );
      socket.off(SOCKET_EVENTS.STORY_VIEWED, safeOnStoryViewed);
      socket.off(SOCKET_EVENTS.STORY_DELETED, safeOnStoryDeleted);
      socket.off(SOCKET_EVENTS.STORY_EXPIRED, safeOnStoryExpired);
      socket.off(SOCKET_EVENTS.ACCOUNT_DELETED, safeOnAccountDeleted);
      socket.off(SOCKET_EVENTS.USER_UPDATED, safeOnUserUpdated);
      socket.off(
        SOCKET_EVENTS.DISCOVER_USER_DISMISSED,
        safeOnDiscoverUserDismissed
      );
      socket.off(SOCKET_EVENTS.CALL_INCOMING, safeOnCallIncoming);
      socket.off(SOCKET_EVENTS.CALL_ACCEPTED, safeOnCallAccepted);
      socket.off(SOCKET_EVENTS.CALL_REJECTED, safeOnCallRejected);
      socket.off(SOCKET_EVENTS.CALL_CANCELED, safeOnCallCanceled);
      socket.off(SOCKET_EVENTS.CALL_ENDED, safeOnCallEnded);
      socket.off(SOCKET_EVENTS.CALL_OFFER, safeOnCallOffer);
      socket.off(SOCKET_EVENTS.CALL_ANSWER, safeOnCallAnswer);
      socket.off(SOCKET_EVENTS.CALL_ICE_CANDIDATE, safeOnCallIceCandidate);
      socket.off(SOCKET_EVENTS.CALL_ERROR, safeOnCallError);
      socket.io.off("reconnect_attempt", safeOnReconnectAttempt);
      socket.io.off("reconnect_error", safeOnReconnectError);
      socket.io.off("reconnect_failed", safeOnReconnectFailed);
      window.removeEventListener("offline", handleOffline);
    };
  }, [
    addMessage,
    queryClient,
    resetPendingMessageFlights,
    setConnectionError,
    setOnlineUsers,
    setTypingUsers,
    updateConversationMessage,
    updateMessageStatus,
  ]);

  return children;
}
