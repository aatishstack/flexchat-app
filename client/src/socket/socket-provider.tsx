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
import { updateConversationInQueryCache } from "@/lib/conversation-query-cache";
import type { ConversationQueryCache } from "@/lib/conversation-query-cache";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import { queryKeys } from "@/lib/query-keys";
import { tokenStorage } from "@/lib/token";
import { useNotificationStore } from "@/store/notification-store";

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

const CONVERSATION_UPDATE_DEDUPE_TTL_MS =
  2 * 60 * 1000;

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

    function onDisconnect(reason: string) {
      resetPendingMessageFlights();

      useSocketStore.setState({
        isConnected: false,
        isConnecting: false,
        typingUsers: [],
      });

      if (reason === "io server disconnect") {
        setConnectionError(
          "Realtime disconnected by server"
        );
      }
    }

    function onConnectError(error: Error) {
      setConnectionError(error.message);

      if (
        error.message
          .toLowerCase()
          .includes("unauthorized")
      ) {
        tokenStorage.remove();
        useSocketStore
          .getState()
          .disconnectSocket();
        useAuthStore
          .getState()
          .logout();
      }
    }

    function onOnlineUsers(users: string[]) {
      setOnlineUsers(users);
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
      updateConversationMessage(
        message.conversationId,
        message.text,
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
        useNotificationStore
          .getState()
          .addNotification({
            id: payload.messageId,
            title: conversationName,
            message:
              latestMessage ||
              "New message",
            createdAt:
              payload.createdAt ??
              new Date().toISOString(),
            read: false,
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

    function onReconnectAttempt() {
      useSocketStore.setState({
        isConnecting: true,
        connectionError: null,
      });
    }

    function onReconnectFailed() {
      setConnectionError(
        "Realtime reconnect failed"
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

    socket.on(SOCKET_EVENTS.CONNECT, onConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, onDisconnect);
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, onConnectError);
    socket.on(SOCKET_EVENTS.ONLINE_USERS, onOnlineUsers);
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceiveMessage);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
    socket.on(SOCKET_EVENTS.TYPING_USERS, onTypingUsers);
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, onMessageSeen);
    socket.on(SOCKET_EVENTS.CONVERSATION_ERROR, onConversationError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect_failed", onReconnectFailed);

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, onConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, onDisconnect);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR, onConnectError);
      socket.off(SOCKET_EVENTS.ONLINE_USERS, onOnlineUsers);
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceiveMessage);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
      socket.off(SOCKET_EVENTS.TYPING_USERS, onTypingUsers);
      socket.off(SOCKET_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE_SEEN, onMessageSeen);
      socket.off(SOCKET_EVENTS.CONVERSATION_ERROR, onConversationError);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect_failed", onReconnectFailed);
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
