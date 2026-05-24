"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { socket } from "./socket";
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
const PENDING_NOTIFICATION_CONVERSATION_KEY =
  "flexchat:pending-conversation";

const recentConversationUpdates = new Map<
  string,
  number
>();

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

  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission().catch(() => "denied");
  }

  if (permission !== "granted") {
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
      handler(...args);
    } catch (error) {
      console.error(
        `Socket handler failed for ${eventName}`,
        error,
      );
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

  useEffect(() => {
    function onConnect() {
      useSocketStore.setState((state) => ({
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

      if (socketState.activeConversationId) {
        void queryClient.refetchQueries({
          queryKey:
            queryKeys.messages.list(
              socketState.activeConversationId
            ),
        });
      }
    }

    function onDisconnect() {
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
    }

    function onConnectError(error: Error) {
      console.error("[FlexChat Socket] connect_error", {
        message: error.message,
        transport:
          socket.io.engine?.transport?.name ??
          "none",
        url:
          (socket.io as unknown as {
            uri?: string;
          }).uri ?? "unknown",
        online: navigator.onLine,
      });

      useSocketStore.setState({
        isConnecting: false,
        connectionError: error.message,
      });

      const normalizedMessage =
        error.message.toLowerCase();

      if (
        normalizedMessage.includes("unauthorized") &&
        !normalizedMessage.includes("unavailable")
      ) {
        clearClientSession();

        return;
      }

      // Socket.IO's built-in reconnection engine handles retries.
    }

    function onOnlineUsers(users: string[]) {
      setOnlineUsers(users);
    }

    function onPresenceUpdated(
      payload: PresenceUpdatedPayload
    ) {
      if (!payload.userId) {
        return;
      }

      useSocketStore.setState((state) => {
        const users = new Set(state.onlineUsers);

        if (payload.status === "online") {
          users.add(payload.userId ?? "");
        } else if (payload.status === "offline") {
          users.delete(payload.userId ?? "");
        }

        return {
          onlineUsers: Array.from(users)
            .filter(Boolean)
            .sort(),
        };
      });

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) => {
          if (!cache || !payload.lastSeenAt) {
            return cache;
          }

          const updateMembers = (conversation: Conversation): Conversation => ({
            ...conversation,
            members:
              conversation.members?.map((member) =>
                member.id === payload.userId
                  ? {
                      ...member,
                      lastSeenAt:
                        payload.lastSeenAt ?? member.lastSeenAt,
                    }
                  : member
              ) ?? conversation.members,
          });

          if (Array.isArray(cache)) {
            return cache.map((conversation) =>
              updateMembers(conversation)
            );
          }

          if ("pages" in cache) {
            return {
              ...cache,
              pages: cache.pages.map((page) => ({
                ...page,
                conversations:
                  page.conversations.map((conversation) =>
                    updateMembers(conversation)
                  ),
              })),
            };
          }

          return cache;
        }
      );
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
      if (Array.isArray(payload)) {
        setTypingUsers(payload);
        return;
      }

      const activeConversationId =
        useSocketStore.getState().activeConversationId;

      if (
        payload.conversationId &&
        payload.conversationId !== activeConversationId
      ) {
        return;
      }

      setTypingUsers(payload.users ?? []);
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

    function onStoryCreated(story: Story) {
      if (!story?.id) {
        return;
      }

      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) => [
          story,
          ...(stories ?? []).filter(
            (item) => item.id !== story.id
          ),
        ]
      );
    }

    function onStoryViewed(
      payload: StoryViewedPayload
    ) {
      if (!payload.storyId) {
        return;
      }

      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) =>
          stories?.map((story) =>
            story.id === payload.storyId
              ? {
                  ...story,
                  viewed:
                    payload.viewerId ===
                    useAuthStore.getState().user?.id
                      ? true
                      : story.viewed,
                  viewCount:
                    payload.viewerId &&
                    payload.viewerId !== story.userId &&
                    payload.viewerId !== useAuthStore.getState().user?.id
                      ? (story.viewCount ?? 0) + 1
                      : story.viewCount,
                }
              : story
          ) ?? []
      );

      void queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.stories.all,
          payload.storyId,
          "viewers",
        ],
      });
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
      useSocketStore.setState({
        isConnected: false,
        isConnecting: false,
        typingUsers: [],
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
    const safeOnStoryCreated = guardSocketHandler(
      SOCKET_EVENTS.STORY_CREATED,
      onStoryCreated,
    );
    const safeOnStoryViewed = guardSocketHandler(
      SOCKET_EVENTS.STORY_VIEWED,
      onStoryViewed,
    );
    const safeOnStoryDeleted = guardSocketHandler(
      SOCKET_EVENTS.STORY_DELETED,
      onStoryDeleted,
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
    socket.on(SOCKET_EVENTS.STORY_CREATED, safeOnStoryCreated);
    socket.on(SOCKET_EVENTS.STORY_VIEWED, safeOnStoryViewed);
    socket.on(SOCKET_EVENTS.STORY_DELETED, safeOnStoryDeleted);
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
    window.addEventListener("offline", handleOffline);

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
      socket.off(SOCKET_EVENTS.STORY_CREATED, safeOnStoryCreated);
      socket.off(SOCKET_EVENTS.STORY_VIEWED, safeOnStoryViewed);
      socket.off(SOCKET_EVENTS.STORY_DELETED, safeOnStoryDeleted);
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
