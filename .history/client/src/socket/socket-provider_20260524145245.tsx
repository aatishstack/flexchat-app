"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { SOCKET_EVENTS } from "@/socket/socket-events";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import { useNotificationStore } from "@/store/notification-store";
import { useCallStore } from "@/store/call-store";

import { queryKeys } from "@/lib/query-keys";
import { clearClientSession } from "@/lib/session-cleanup";

import type { Message } from "@/store/socket-store";
import type { Story } from "@/types/story";
import type { Conversation } from "@/types/conversation";
import type { CallSession } from "@/store/call-store";

type Props = {
  children: React.ReactNode;
};

type PresencePayload = {
  userId?: string;
  status?: "online" | "offline";
};

type TypingPayload = {
  conversationId: string;
  users: string[];
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

export default function SocketProvider({
  children,
}: Props) {
  const queryClient = useQueryClient();

  const socket = useSocketStore((s) => s.socket);

  const setOnlineUsers = useSocketStore(
    (s) => s.setOnlineUsers,
  );

  const setTypingUsers = useSocketStore(
    (s) => s.setTypingUsers,
  );

  const addMessage = useSocketStore(
    (s) => s.addMessage,
  );

  const updateMessageStatus = useSocketStore(
    (s) => s.updateMessageStatus,
  );

  const setConnectionError = useSocketStore(
    (s) => s.setConnectionError,
  );

  const updateConversationMessage =
    useConversationStore(
      (s) => s.updateConversationMessage,
    );

  useEffect(() => {
    if (!socket) {
      return;
    }

    function onConnect() {
      console.log("[Socket] connected");

      useSocketStore.setState({
        isConnected: true,
        isConnecting: false,
        connectionError: null,
      });
    }

    function onDisconnect(reason: string) {
      console.warn(
        "[Socket] disconnected:",
        reason,
      );

      useSocketStore.setState({
        isConnected: false,
        isConnecting: true,
      });
    }

    function onConnectError(error: Error) {
      console.error(
        "[Socket] connect_error:",
        error.message,
      );

      setConnectionError(error.message);

      if (
        error.message
          .toLowerCase()
          .includes("unauthorized")
      ) {
        clearClientSession();
      }
    }

    function onOnlineUsers(users: string[]) {
      setOnlineUsers(users);
    }

    function onPresenceUpdated(
      payload: PresencePayload,
    ) {
      if (!payload.userId) {
        return;
      }

      useSocketStore.setState((state) => {
        const users = new Set(
          state.onlineUsers,
        );

        if (payload.status === "online") {
          users.add(payload.userId!);
        } else {
          users.delete(payload.userId!);
        }

        return {
          onlineUsers: Array.from(users),
        };
      });
    }

    function onTypingUsers(
      payload: TypingPayload,
    ) {
      const activeConversationId =
        useConversationStore.getState()
          .activeConversationId;

      if (
        payload.conversationId !==
        activeConversationId
      ) {
        return;
      }

      setTypingUsers(payload.users);
    }

    function onReceiveMessage(
      message: Message,
    ) {
      addMessage(message);

      queryClient.invalidateQueries({
        queryKey:
          queryKeys.messages.list(
            message.conversationId,
          ),
      });

      updateConversationMessage(
        message.conversationId,
        message.text || "New message",
      );
    }

    function onMessageDelivered(payload: {
      messageId: string;
      serverId?: string;
    }) {
      updateMessageStatus(
        payload.messageId,
        "delivered",
        payload.serverId,
      );
    }

    function onMessageSeen(payload: {
      messageId: string;
      serverId?: string;
    }) {
      updateMessageStatus(
        payload.messageId,
        "read",
        payload.serverId,
      );
    }

    function onStoryCreated(story: Story) {
      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) => [
          story,
          ...(stories ?? []),
        ],
      );
    }

    function onConversationUpdated(
      conversation: Conversation,
    ) {
      queryClient.invalidateQueries({
        queryKey:
          queryKeys.conversations.all,
      });

      updateConversationMessage(
        conversation.id,
        conversation.latestMessage ||
          "New activity",
      );
    }

    function onUserUpdated(
      payload: UserUpdatedPayload,
    ) {
      const updatedUser = payload.user;

      if (
        !updatedUser?.id ||
        !updatedUser.username
      ) {
        return;
      }

      const updatedUserId = updatedUser.id;
      const updatedUsername =
        updatedUser.username;
      const updatedAvatar =
        updatedUser.avatar ?? null;

      if (
        updatedUserId ===
        useAuthStore.getState().user?.id
      ) {
        useAuthStore
          .getState()
          .updateUser({
            id: updatedUserId,
            username: updatedUsername,
            email: updatedUser.email,
            avatar: updatedAvatar,
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
                    username:
                      updatedUsername,
                    avatar:
                      updatedAvatar,
                  },
                }
              : story,
          ) ?? [],
      );
    }

    function onDiscoverUserDismissed(
      payload: DiscoverUserDismissedPayload,
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
              user.id !==
              payload.userId,
          ) ?? [],
      );
    }

    function onCallIncoming(
      call: CallSession,
    ) {
      useCallStore
        .getState()
        .handleIncomingCall(call);

      useNotificationStore
        .getState()
        .addNotification({
          id: `call-${call.id}`,
          title: "Incoming Call",
          message:
            call.kind === "video"
              ? "Incoming video call"
              : "Incoming voice call",
          kind: "call",
          read: false,
          createdAt:
            new Date().toISOString(),
        });
    }

    function onCallAccepted(
      call: CallSession,
    ) {
      useCallStore
        .getState()
        .handleCallAccepted(call);
    }

    function onCallRejected(payload: {
      callId?: string;
    }) {
      useCallStore
        .getState()
        .handleCallRejected(payload);
    }

    function onCallEnded(payload: {
      callId?: string;
      reason?: string;
    }) {
      useCallStore
        .getState()
        .handleCallEnded(payload);
    }

    socket.on(
      SOCKET_EVENTS.CONNECT,
      onConnect,
    );

    socket.on(
      SOCKET_EVENTS.DISCONNECT,
      onDisconnect,
    );

    socket.on(
      SOCKET_EVENTS.CONNECT_ERROR,
      onConnectError,
    );

    socket.on(
      SOCKET_EVENTS.ONLINE_USERS,
      onOnlineUsers,
    );

    socket.on(
      SOCKET_EVENTS.PRESENCE_UPDATED,
      onPresenceUpdated,
    );

    socket.on(
      SOCKET_EVENTS.TYPING_USERS,
      onTypingUsers,
    );

    socket.on(
      SOCKET_EVENTS.RECEIVE_MESSAGE,
      onReceiveMessage,
    );

    socket.on(
      SOCKET_EVENTS.MESSAGE_DELIVERED,
      onMessageDelivered,
    );

    socket.on(
      SOCKET_EVENTS.MESSAGE_SEEN,
      onMessageSeen,
    );

    socket.on(
      SOCKET_EVENTS.STORY_CREATED,
      onStoryCreated,
    );

    socket.on(
      SOCKET_EVENTS.CONVERSATION_UPDATED,
      onConversationUpdated,
    );

    socket.on(
      SOCKET_EVENTS.USER_UPDATED,
      onUserUpdated,
    );

    socket.on(
      SOCKET_EVENTS.DISCOVER_USER_DISMISSED,
      onDiscoverUserDismissed,
    );

    socket.on(
      SOCKET_EVENTS.CALL_INCOMING,
      onCallIncoming,
    );

    socket.on(
      SOCKET_EVENTS.CALL_ACCEPTED,
      onCallAccepted,
    );

    socket.on(
      SOCKET_EVENTS.CALL_REJECTED,
      onCallRejected,
    );

    socket.on(
      SOCKET_EVENTS.CALL_ENDED,
      onCallEnded,
    );

    return () => {
      socket.off(
        SOCKET_EVENTS.CONNECT,
        onConnect,
      );

      socket.off(
        SOCKET_EVENTS.DISCONNECT,
        onDisconnect,
      );

      socket.off(
        SOCKET_EVENTS.CONNECT_ERROR,
        onConnectError,
      );

      socket.off(
        SOCKET_EVENTS.ONLINE_USERS,
        onOnlineUsers,
      );

      socket.off(
        SOCKET_EVENTS.PRESENCE_UPDATED,
        onPresenceUpdated,
      );

      socket.off(
        SOCKET_EVENTS.TYPING_USERS,
        onTypingUsers,
      );

      socket.off(
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        onReceiveMessage,
      );

      socket.off(
        SOCKET_EVENTS.MESSAGE_DELIVERED,
        onMessageDelivered,
      );

      socket.off(
        SOCKET_EVENTS.MESSAGE_SEEN,
        onMessageSeen,
      );

      socket.off(
        SOCKET_EVENTS.STORY_CREATED,
        onStoryCreated,
      );

      socket.off(
        SOCKET_EVENTS.CONVERSATION_UPDATED,
        onConversationUpdated,
      );

      socket.off(
        SOCKET_EVENTS.USER_UPDATED,
        onUserUpdated,
      );

      socket.off(
        SOCKET_EVENTS.DISCOVER_USER_DISMISSED,
        onDiscoverUserDismissed,
      );

      socket.off(
        SOCKET_EVENTS.CALL_INCOMING,
        onCallIncoming,
      );

      socket.off(
        SOCKET_EVENTS.CALL_ACCEPTED,
        onCallAccepted,
      );

      socket.off(
        SOCKET_EVENTS.CALL_REJECTED,
        onCallRejected,
      );

      socket.off(
        SOCKET_EVENTS.CALL_ENDED,
        onCallEnded,
      );
    };
  }, [
    socket,
    queryClient,
    addMessage,
    setOnlineUsers,
    setTypingUsers,
    updateMessageStatus,
    setConnectionError,
    updateConversationMessage,
  ]);

  return <>{children}</>;
}