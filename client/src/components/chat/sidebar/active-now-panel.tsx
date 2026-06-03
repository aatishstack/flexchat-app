"use client";

import { useMemo } from "react";

import {
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useUsersByIdsQuery } from "@/hooks/queries/use-users-query";
import {
  upsertConversationInQueryCache,
} from "@/lib/conversation-query-cache";
import type {
  ConversationQueryCache,
} from "@/lib/conversation-query-cache";
import { queryKeys } from "@/lib/query-keys";
import FlexAvatar from "@/components/chat/flex-avatar";
import { formatDisplayName } from "@/lib/user-display";
import { createDirectConversation } from "@/services/conversation.service";
import { useSocketStore } from "@/store/socket-store";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import type { Conversation } from "@/types/conversation";
import { useShallow } from "zustand/react/shallow";

type ActiveNowPanelProps = {
  variant?: "rail" | "sheet";
  onConversationOpen?: () => void;
};

export default function ActiveNowPanel({
  variant = "rail",
  onConversationOpen,
}: ActiveNowPanelProps) {
  const reducedMotion =
    useReducedMotion();
  const queryClient =
    useQueryClient();
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const currentUserId =
    useAuthStore(
      (state) => state.user?.id
    );
  const onlineUsers =
    useSocketStore(
      useShallow((state) =>
        state.onlineUsers)
    );
  const onlinePeerIds =
    useMemo(
      () =>
        onlineUsers.filter(
          (userId) =>
            userId !== currentUserId
        ),
      [
        currentUserId,
        onlineUsers,
      ]
    );
  const onlineUsersQuery =
    useUsersByIdsQuery(
      onlinePeerIds
    );
  const users =
    onlineUsersQuery.data ?? [];
  const conversationsQuery =
    useConversationsQuery();
  const setActiveConversation =
    useConversationStore(
      (state) =>
        state.setActiveConversation
    );

  const directConversationByUserId =
    useMemo(() => {
      const map =
        new Map<string, Conversation>();

      conversationsQuery.data?.forEach(
        (conversation) => {
          if (
            conversation.type !== "direct"
          ) {
            return;
          }

          conversation.memberIds?.forEach(
            (memberId) => {
              if (
                memberId !==
                currentUserId
              ) {
                map.set(
                  memberId,
                  conversation
                );
              }
            }
          );
        }
      );

      return map;
    }, [
      conversationsQuery.data,
      currentUserId,
    ]);

  const startConversation =
    useMutation({
      mutationFn:
        createDirectConversation,
      onSuccess: (conversation) => {
        queryClient.setQueryData<ConversationQueryCache>(
          queryKeys.conversations.all,
          (cache) =>
            upsertConversationInQueryCache(
              cache,
              conversation
            )
        );

        setActiveConversation(
          conversation
        );
        onConversationOpen?.();

        void queryClient.invalidateQueries({
          queryKey:
            queryKeys.conversations.all,
        });
      },
      onError: () => {
        pushToast({
          title:
            "Conversation unavailable",
          message:
            "Please try opening that chat again.",
          variant: "error",
        });
      },
    });

  return (
    <aside
      className={
        variant === "rail"
          ? "hidden h-full w-[320px] border-l border-[var(--fc-app-border)] bg-[var(--fc-app-panel)] shadow-2xl shadow-black/20 xl:flex xl:flex-col"
          : "flex h-full w-full flex-col bg-[var(--fc-app-panel)]"
      }
    >
      <div className="border-b border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold text-white">
          Active Now
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Live presence
        </p>
      </div>

      <div className="chat-safe-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {onlineUsersQuery.isLoading &&
        onlinePeerIds.length ? (
          <div className="space-y-3">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-[82px] animate-pulse rounded-3xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : null}

        {onlineUsersQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Unable to load presence
          </div>
        ) : null}

        {!onlinePeerIds.length ||
        (!onlineUsersQuery.isLoading &&
          !users.length) ? (
          <div className="flex h-full items-center justify-center px-6 py-10 text-center">
            <div className="max-w-[220px]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-500 shadow-[0_0_18px_rgba(113,113,122,0.55)]" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-300">
                Quiet right now
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Online friends will appear here as soon as presence updates.
              </p>
            </div>
          </div>
        ) : null}

        {users.map((user) => {
          const existingConversation =
            directConversationByUserId.get(
              user.id
            );
          const isPending =
            startConversation.variables ===
              user.id &&
            startConversation.isPending;

          return (
          <motion.button
            key={user.id}
            type="button"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    x: 18,
                  }
            }
            animate={{
              opacity: 1,
              x: 0,
            }}
            onClick={() => {
              if (existingConversation) {
                setActiveConversation(
                  existingConversation
                );
                onConversationOpen?.();
                return;
              }

              startConversation.mutate(
                user.id
              );
            }}
            disabled={isPending}
            className="flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-left shadow-lg shadow-black/10 transition hover:border-sky-300/25 hover:bg-sky-500/[0.08] disabled:cursor-wait disabled:opacity-70"
          >
            <div className="relative">
              <FlexAvatar
                src={user.avatar}
                name={user.username}
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#2AABEE] to-[#168ACD] text-lg font-bold text-white"
              />

              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#0B111C] bg-green-500 shadow-lg shadow-green-500/40" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-medium text-white">
                {formatDisplayName(
                  user.username
                )}
              </h3>

              <p className="text-sm text-zinc-500">
                {isPending
                  ? "Opening..."
                  : "Online"}
              </p>
            </div>
          </motion.button>
          );
        })}
      </div>
    </aside>
  );
}
