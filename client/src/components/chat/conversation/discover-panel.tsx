"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock3,
  Loader2,
  MessageCircle,
  Search,
  UserRoundPlus,
  UsersRound,
  X,
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
import { dismissDiscoverUser } from "@/services/user.service";
import { createDirectConversation } from "@/services/conversation.service";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import type { Conversation } from "@/types/conversation";
import type { PublicUser } from "@/types/user";

type DiscoverPanelProps = {
  variant?: "rail" | "sheet";
  onConversationOpen?: () => void;
};

export default function DiscoverPanel({
  variant = "rail",
  onConversationOpen,
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

  const directContacts =
    useMemo(() => {
      return (conversationsQuery.data ?? [])
        .filter(
          (conversation) =>
            conversation.type === "direct",
        )
        .map((conversation) => {
          const member =
            conversation.members?.find(
              (item) =>
                item.id !== currentUserId,
            );
          const memberId =
            member?.id ??
            conversation.memberIds?.find(
              (item) =>
                item !== currentUserId,
            ) ??
            conversation.id;

          return {
            id: memberId,
            username:
              member?.username ??
              conversation.name ??
              "FlexChat user",
            avatar:
              member?.avatar ??
              conversation.avatar ??
              null,
            lastSeenAt:
              member?.lastSeenAt ?? null,
            conversation,
          };
        });
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
        setSearch("");
        setDebouncedSearch("");
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
            "Please try starting that chat again.",
          variant: "error",
        });
      },
    });

  const dismissUser =
    useMutation({
      mutationFn:
        dismissDiscoverUser,
      onMutate: async (userId) => {
        await queryClient.cancelQueries({
          queryKey:
            queryKeys.users.discover(
              debouncedSearch
                .trim()
                .toLowerCase()
            ),
        });

        queryClient.setQueryData<
          PublicUser[]
        >(
          queryKeys.users.discover(
            debouncedSearch
              .trim()
              .toLowerCase()
          ),
          (currentUsers) =>
            currentUsers?.filter(
              (user) =>
                user.id !== userId
            ) ?? []
        );
      },
      onError: () => {
        pushToast({
          title:
            "Could not remove user",
          message:
            "Please try again in a moment.",
          variant: "error",
        });
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey:
            queryKeys.users.discover(
              debouncedSearch
                .trim()
                .toLowerCase()
            ),
        });
      },
    });

  const users =
    discoverQuery.data ?? [];
  const normalizedSearch =
    debouncedSearch.trim().toLowerCase();
  const searchActive =
    normalizedSearch.length > 0;
  const filteredContacts =
    searchActive
      ? directContacts.filter((contact) => {
          const label = `${contact.username} ${
            contact.conversation.name ?? ""
          } ${contact.conversation.latestMessage ?? ""}`.toLowerCase();

          return label.includes(normalizedSearch);
        })
      : directContacts.slice(0, 6);
  const newlyJoinedUsers =
    users.filter(
      (user) =>
        !directConversationByUserId.has(user.id),
    );
  const pendingTargetUserId =
    startConversation.variables;

  return (
    <aside
      className={
        variant === "rail"
          ? "hidden w-[320px] border-r border-[var(--fc-app-border)] bg-[var(--fc-app-panel)] shadow-2xl shadow-black/20 backdrop-blur-3xl xl:flex xl:flex-col"
          : "flex h-full w-full flex-col bg-[var(--fc-app-panel)] backdrop-blur-3xl"
      }
    >
      <div className="border-b border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold text-white">
          Contacts
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Recent chats and real FlexChat users
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
            placeholder="Search name or phone number..."
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#2AABEE]/45"
          />
        </div>
      </div>

      <div className="chat-safe-scroll min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {discoverQuery.isLoading || conversationsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({
              length: 5,
            }).map((_, index) => (
              <div
                key={index}
                className="h-[76px] animate-pulse rounded-2xl bg-white/[0.04]"
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
        !conversationsQuery.isLoading &&
        !discoverQuery.isError ? (
          <>
            {filteredContacts.length ? (
              <section>
                <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  {searchActive ? (
                    <UsersRound size={13} />
                  ) : (
                    <Clock3 size={13} />
                  )}
                  {searchActive ? "Contacts" : "Recent chats"}
                </div>

                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <motion.button
                      key={contact.conversation.id}
                      type="button"
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
                      onClick={() => {
                        setActiveConversation(contact.conversation);
                        setSearch("");
                        setDebouncedSearch("");
                        onConversationOpen?.();
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-[#2AABEE]/25 hover:bg-[#2AABEE]/10"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <FlexAvatar
                          src={contact.avatar}
                          name={contact.username}
                          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0E1621] text-base font-bold text-white ring-1 ring-white/10"
                        />

                        <span className="min-w-0">
                          <span className="block truncate font-medium text-white">
                            {formatDisplayName(contact.username)}
                          </span>
                          <span className="block truncate text-sm text-zinc-500">
                            {contact.conversation.latestMessage ||
                              formatHandle(contact.username)}
                          </span>
                        </span>
                      </span>

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2AABEE]/12 text-[#75CFF6]">
                        <MessageCircle size={16} />
                      </span>
                    </motion.button>
                  ))}
                </div>
              </section>
            ) : null}

            {(searchActive ? users : newlyJoinedUsers).length ? (
              <section>
                <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  <UserRoundPlus size={13} />
                  {searchActive ? "FlexChat users" : "Newly joined"}
                </div>

                <div className="space-y-2">
                  {(searchActive ? users : newlyJoinedUsers).map((user) => {
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
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-[#2AABEE]/25 hover:bg-[#2AABEE]/10"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FlexAvatar
                            src={user.avatar}
                            name={user.username}
                            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#2AABEE] to-[#75CFF6] text-base font-bold text-white ring-1 ring-white/10"
                          />

                          <div className="min-w-0">
                            <h3 className="truncate font-medium text-white">
                              {formatDisplayName(
                                user.username
                              )}
                            </h3>

                            <p className="truncate text-sm text-zinc-500">
                              {searchActive && user.phoneNumber
                                ? user.phoneNumber
                                : formatHandle(user.username)}
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
                              setSearch("");
                              setDebouncedSearch("");
                              onConversationOpen?.();
                              return;
                            }

                            startConversation.mutate(
                              user.id
                            );
                          }}
                          disabled={isPending}
                          className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-[#2AABEE]/25 bg-[#2AABEE]/12 px-3 text-sm font-medium text-[#A7D8FF] transition hover:bg-[#2AABEE]/22 disabled:cursor-wait disabled:opacity-60"
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

                        {!searchActive ? (
                          <button
                            type="button"
                            onClick={() =>
                              dismissUser.mutate(user.id)
                            }
                            disabled={
                              dismissUser.isPending
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 transition hover:border-red-300/25 hover:bg-red-500/10 hover:text-red-100 disabled:cursor-wait disabled:opacity-50"
                            aria-label={`Remove ${user.username} from Discover`}
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {!filteredContacts.length &&
            !(searchActive ? users : newlyJoinedUsers).length ? (
              <div className="flex h-full min-h-56 items-center justify-center px-4 text-center text-sm text-zinc-500">
                {searchActive
                  ? "No matching contacts or users"
                  : "No contacts yet"}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}
