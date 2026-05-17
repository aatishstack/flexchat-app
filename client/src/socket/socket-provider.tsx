"use client";

import { useEffect } from "react";

import { socket } from "./socket";
import { SOCKET_EVENTS } from "./socket-events";

import {
  Message,
  useSocketStore,
} from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import { tokenStorage } from "@/lib/token";

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

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
          .activeConversation?.id;
      const isRemoteMessage =
        message.senderId !== "me" &&
        message.senderId !== currentUserId;

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
      updateMessageStatus(
        receipt.messageId,
        receipt.status ?? "delivered",
        receipt.serverId
      );
    }

    function onMessageSeen(receipt: MessageReceipt) {
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

    socket.on(SOCKET_EVENTS.CONNECT, onConnect);
    socket.on(SOCKET_EVENTS.DISCONNECT, onDisconnect);
    socket.on(SOCKET_EVENTS.CONNECT_ERROR, onConnectError);
    socket.on(SOCKET_EVENTS.ONLINE_USERS, onOnlineUsers);
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceiveMessage);
    socket.on(SOCKET_EVENTS.TYPING_USERS, onTypingUsers);
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, onMessageSeen);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect_failed", onReconnectFailed);

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, onConnect);
      socket.off(SOCKET_EVENTS.DISCONNECT, onDisconnect);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR, onConnectError);
      socket.off(SOCKET_EVENTS.ONLINE_USERS, onOnlineUsers);
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, onReceiveMessage);
      socket.off(SOCKET_EVENTS.TYPING_USERS, onTypingUsers);
      socket.off(SOCKET_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE_SEEN, onMessageSeen);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect_failed", onReconnectFailed);
    };
  }, [
    addMessage,
    resetPendingMessageFlights,
    setConnectionError,
    setOnlineUsers,
    setTypingUsers,
    updateConversationMessage,
    updateMessageStatus,
  ]);

  return children;
}
