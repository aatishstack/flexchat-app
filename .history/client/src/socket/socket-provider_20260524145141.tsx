"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { socket } from "@/socket/socket";
import { queryKeys } from "@/lib/query-keys";

import { useAuthStore } from "@/store/auth.store";
import { useCallStore } from "@/store/call-store";
import { usePresenceStore } from "@/store/presence-store";
import { useTypingStore } from "@/store/typing-store";

import type { Story } from "@/types/story";
import type { Message } from "@/types/message";
import type { CallSession } from "@/types/call";
import type {
  PresencePayload,
  TypingPayload,
  UserUpdatedPayload,
  DiscoverUserDismissedPayload,
} from "@/types/socket";

type Props = {
  children: React.ReactNode;
};

export default function SocketProvider({ children }: Props) {
  const queryClient = useQueryClient();

  useEffect(() => {
    function onUserUpdated(payload: UserUpdatedPayload) {
      const updatedUser = payload.user;

      if (!updatedUser?.id || !updatedUser.username) {
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

      if (updatedUserId === useAuthStore.getState().user?.id) {
        useAuthStore.getState().updateUser({
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
              : story,
          ) ?? [],
      );

      queryClient.setQueriesData<
        { id: string; username: string; avatar?: string | null }[]
      >(
        { queryKey: ["users"] },
        (users) =>
          users?.map((user) =>
            user.id === updatedUserId
              ? {
                  ...user,
                  username: updatedUsername,
                  avatar: updatedAvatar,
                }
              : user,
          ) ?? users,
      );

      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      void queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    }

    function onDiscoverUserDismissed(
      payload: DiscoverUserDismissedPayload,
    ) {
      if (!payload.userId) {
        return;
      }

      queryClient.setQueriesData<
        { id: string; username: string; avatar?: string | null }[]
      >(
        { queryKey: ["users", "discover"] },
        (users) =>
          users?.filter(
            (user) => user.id !== payload.userId,
          ) ?? users,
      );
    }

    function onCallIncoming(call: CallSession) {
      useCallStore.getState().setIncomingCall(call);
    }

    function onCallAccepted(payload: {
      callId: string;
      acceptedBy: string;
    }) {
      useCallStore.getState().markCallAccepted(
        payload.callId,
        payload.acceptedBy,
      );
    }

    function onCallRejected(payload: {
      callId: string;
      rejectedBy: string;
    }) {
      useCallStore.getState().markCallRejected(
        payload.callId,
        payload.rejectedBy,
      );
    }

    function onCallEnded(payload: {
      callId: string;
    }) {
      useCallStore.getState().endCall(payload.callId);
    }

    function onTypingStart(payload: TypingPayload) {
      useTypingStore.getState().startTyping(
        payload.conversationId,
        payload.userId,
      );
    }

    function onTypingStop(payload: TypingPayload) {
      useTypingStore.getState().stopTyping(
        payload.conversationId,
        payload.userId,
      );
    }

    function onMessageReceived(message: Message) {
      queryClient.setQueryData<Message[]>(
        queryKeys.messages.byConversation(
          message.conversationId,
        ),
        (messages) => {
          const exists = messages?.some(
            (m) => m.id === message.id,
          );

          if (exists) {
            return messages;
          }

          return [...(messages ?? []), message];
        },
      );

      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    }

    function onMessageUpdated(message: Message) {
      queryClient.setQueryData<Message[]>(
        queryKeys.messages.byConversation(
          message.conversationId,
        ),
        (messages) =>
          messages?.map((m) =>
            m.id === message.id ? message : m,
          ) ?? [],
      );
    }

    function onMessageDeleted(payload: {
      messageId: string;
      conversationId: string;
    }) {
      queryClient.setQueryData<Message[]>(
        queryKeys.messages.byConversation(
          payload.conversationId,
        ),
        (messages) =>
          messages?.filter(
            (message) =>
              message.id !== payload.messageId,
          ) ?? [],
      );
    }

    function onPresenceUpdated(
      payload: PresencePayload,
    ) {
      usePresenceStore.getState().updatePresence(
        payload.userId,
        payload.status,
      );
    }

    socket.on("user:updated", onUserUpdated);

    socket.on(
      "discover:user-dismissed",
      onDiscoverUserDismissed,
    );

    socket.on("call:incoming", onCallIncoming);

    socket.on("call:accepted", onCallAccepted);

    socket.on("call:rejected", onCallRejected);

    socket.on("call:ended", onCallEnded);

    socket.on("typing:start", onTypingStart);

    socket.on("typing:stop", onTypingStop);

    socket.on("message:new", onMessageReceived);

    socket.on("message:updated", onMessageUpdated);

    socket.on("message:deleted", onMessageDeleted);

    socket.on("presence:update", onPresenceUpdated);

    return () => {
      socket.off("user:updated", onUserUpdated);

      socket.off(
        "discover:user-dismissed",
        onDiscoverUserDismissed,
      );

      socket.off("call:incoming", onCallIncoming);

      socket.off("call:accepted", onCallAccepted);

      socket.off("call:rejected", onCallRejected);

      socket.off("call:ended", onCallEnded);

      socket.off("typing:start", onTypingStart);

      socket.off("typing:stop", onTypingStop);

      socket.off("message:new", onMessageReceived);

      socket.off(
        "message:updated",
        onMessageUpdated,
      );

      socket.off(
        "message:deleted",
        onMessageDeleted,
      );

      socket.off(
        "presence:update",
        onPresenceUpdated,
      );
    };
  }, [queryClient]);

  return <>{children}</>;
}