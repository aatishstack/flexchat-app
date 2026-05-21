"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  MessageCircle,
  Search,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useDiscoverUsersQuery } from "@/hooks/queries/use-users-query";
import {
  upsertConversationInQueryCache,
} from "@/lib/conversation-query-cache";
import FlexAvatar from "@/components/chat/flex-avatar";
import type { ConversationQueryCache } from "@/lib/conversation-query-cache";
import { queryKeys } from "@/lib/query-keys";
import {
  formatDisplayName,
  formatHandle,
} from "@/lib/user-display";
import { createDirectConversation } from "@/services/conversation.service";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import type { Conversation } from "@/types/conversation";

type DiscoverPanelProps = {
  variant?: "rail" | "sheet";
};

export default function DiscoverPanel({
  variant = "rail",
}: DiscoverPanelProps) {
  const [search, setSearch] =
    useState("");
  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");
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
  const setActiveConversation =
    useConversationStore(
      (state) =>
        state.setActiveConversation
    );
  const conversationsQuery =
    useConversationsQuery();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  const discoverQuery =
    useDiscoverUsersQuery(debouncedSearch);

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
            "Please try starting that chat again.",
          variant: "error",
        });
      },
    });

  const users =
    discoverQuery.data ?? [];
  const pendingTargetUserId =
    startConversation.variables;

  return (
    <aside
      className={
        variant === "rail"
          ? "hidden w-[320px] border-r border-white/10 bg-[#08111f]/[0.82] shadow-2xl shadow-black/20 backdrop-blur-3xl xl:flex xl:flex-col"
          : "flex h-full w-full flex-col bg-[#08111f]/[0.94] backdrop-blur-3xl"
      }
    >
      <div className="border-b border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold text-white">
          Discover
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Real users on FlexChat
        </p>

        <div className="relative mt-4">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search users..."
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple-500/40"
          />
        </div>
      </div>

      <div className="chat-safe-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {discoverQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({
              length: 5,
            }).map((_, index) => (
              <div
                key={index}
                className="h-[82px] animate-pulse rounded-3xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : null}

        {discoverQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Unable to load users
          </div>
        ) : null}

        {!discoverQuery.isLoading &&
        !discoverQuery.isError &&
        !users.length ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
            No users found
          </div>
        ) : null}

        {users.map((user) => {
          const existingConversation =
            directConversationByUserId.get(
              user.id
            );
          const hasDirectConversation =
            !!existingConversation;
          const isPending =
            pendingTargetUserId ===
              user.id &&
            startConversation.isPending;

          return (
            <motion.div
              key={user.id}
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 10,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-lg shadow-black/10"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FlexAvatar
                  src={user.avatar}
                  name={user.username}
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-base font-bold text-white"
                />

                <div className="min-w-0">
                  <h3 className="truncate font-medium text-white">
                    {formatDisplayName(
                      user.username
                    )}
                  </h3>

                  <p className="truncate text-sm text-zinc-500">
                    {formatHandle(
                      user.username
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (existingConversation) {
                    setActiveConversation(
                      existingConversation
                    );
                    return;
                  }

                  startConversation.mutate(
                    user.id
                  );
                }}
                disabled={isPending}
                className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 px-3 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-wait disabled:opacity-60"
                aria-label={
                  hasDirectConversation
                    ? `Open conversation with ${user.username}`
                    : `Message ${user.username}`
                }
              >
                {isPending ? (
                  <Loader2
                    size={17}
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <MessageCircle size={17} />
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </aside>
  );
}
