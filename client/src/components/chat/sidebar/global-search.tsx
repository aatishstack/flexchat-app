"use client";

import {
  Search,
  X,
} from "lucide-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useDiscoverUsersQuery } from "@/hooks/queries/use-users-query";
import {
  upsertConversationInQueryCache,
} from "@/lib/conversation-query-cache";
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

import { useGlobalSearchStore } from "@/store/global-search-store";
import type { Conversation } from "@/types/conversation";

export default function GlobalSearch() {
  const [
    debouncedQuery,
    setDebouncedQuery,
  ] = useState("");
  const queryClient =
    useQueryClient();
  const currentUserId =
    useAuthStore(
      (state) =>
        state.user?.id
    );
  const pushToast =
    useToastStore(
      (state) =>
        state.pushToast
    );
  const conversationsQuery =
    useConversationsQuery();

  const conversationPatches =
    useConversationStore(
      (state) =>
        state.conversationPatches
    );

  const setActiveConversation =
    useConversationStore(
      (state) =>
        state.setActiveConversation
    );

  const open =
    useGlobalSearchStore(
      (state) =>
        state.open
    );

  const query =
    useGlobalSearchStore(
      (state) =>
        state.query
    );

  const setOpen =
    useGlobalSearchStore(
      (state) =>
        state.setOpen
    );

  const setQuery =
    useGlobalSearchStore(
      (state) =>
        state.setQuery
    );
  const normalizedQuery =
    query.trim().toLowerCase();
  const normalizedDebouncedQuery =
    debouncedQuery.trim();

  const discoverQuery =
    useDiscoverUsersQuery(
      debouncedQuery,
      {
        enabled:
          open &&
          normalizedDebouncedQuery.length > 0,
        scope: "search",
      }
    );

  const startConversation =
    useMutation({
      mutationFn:
        createDirectConversation,
      onSuccess: (
        conversation
      ) => {
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
        setOpen(false);

        void queryClient.invalidateQueries({
          queryKey:
            queryKeys.conversations.all,
        });
      },
      onError: () => {
        pushToast({
          title: "Connection failed",
          message:
            "Could not start conversation. Please try again.",
          variant: "error",
        });
      },
    });

  const conversations =
    useMemo(
      () =>
        (conversationsQuery.data ?? []).map(
          (conversation) => {
            const patch =
              conversationPatches[
                conversation.id
              ];

            return patch
              ? {
                  ...conversation,
                  ...patch,
                }
              : conversation;
          }
        ),
      [
        conversationsQuery.data,
        conversationPatches,
      ]
    );

  const directConversationByUserId =
    useMemo(() => {
      const conversationsByUserId =
        new Map<string, Conversation>();

      conversations.forEach(
        (conversation) => {
          if (
            conversation.type !==
            "direct"
          ) {
            return;
          }

          const memberId =
            conversation.members?.find(
              (member) =>
                member.id !==
                currentUserId
            )?.id ??
            conversation.memberIds?.find(
              (memberId) =>
                memberId !==
                currentUserId
            );

          if (memberId) {
            conversationsByUserId.set(
              memberId,
              conversation
            );
          }
        }
      );

      return conversationsByUserId;
    }, [
      conversations,
      currentUserId,
    ]);

  const filtered =
    useMemo(() => {
      return conversations.filter(
        (conversation) =>
          !conversation.archivedAt &&
          conversation.name
            ?.toLowerCase()
            .includes(
              normalizedQuery
            )
      );
    }, [
      conversations,
      normalizedQuery,
    ]);

  const userResults =
    useMemo(() => {
      if (!normalizedDebouncedQuery) {
        return [];
      }

      const filteredConversationIds =
        new Set(
          filtered.map(
            (conversation) =>
              conversation.id
          )
        );

      return (
        discoverQuery.data ?? []
      ).filter((user) => {
        const existingConversation =
          directConversationByUserId.get(
            user.id
          );

        return (
          !existingConversation ||
          !filteredConversationIds.has(
            existingConversation.id
          )
        );
      });
    }, [
      directConversationByUserId,
      discoverQuery.data,
      filtered,
      normalizedDebouncedQuery,
    ]);

  const isSearchingUsers =
    normalizedDebouncedQuery.length >
      0 && discoverQuery.isLoading;

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setDebouncedQuery(
          query
        );
      }, 200);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    query,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    setOpen,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-start justify-center bg-[#0C0C10]/80 px-3 pt-[calc(5rem+env(safe-area-inset-top))] backdrop-blur-3xl">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#16161D] shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4 border-b border-white/[0.05] px-6 py-5">
          <Search
            size={20}
            className="text-white/30"
          />

          <input
            autoFocus
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            placeholder="Search messages, people or groups"
            className="flex-1 bg-transparent text-[16.5px] font-medium text-white outline-none placeholder:text-white/30"
          />

          <button
            type="button"
            onClick={() =>
              setOpen(
                false
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] text-white/20 transition-colors hover:text-white"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[600px] space-y-2 overflow-y-auto p-4">
          {filtered.map(
            (
              conversation
            ) => (
              <button
                type="button"
                key={
                  conversation.id
                }
                onClick={() => {
                  setActiveConversation(
                    conversation
                  );
                  setOpen(false);
                }}
                className="flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.05]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4FF0] to-[#A78BFA] text-lg font-bold text-white shadow-lg">
                  {conversation.name?.charAt(
                    0
                  ) || "F"}
                </div>

                <div>
                  <h3 className="font-medium text-white">
                    {
                      conversation.name
                    }
                  </h3>

                  <p className="text-sm text-zinc-500">
                    {
                      conversation.latestMessage
                    }
                  </p>
                </div>
              </button>
            )
          )}

          {userResults.map(
            (user) => {
              const existingConversation =
                directConversationByUserId.get(
                  user.id
                );
              const displayName =
                user.displayName ??
                user.username;
              const isPending =
                startConversation.isPending &&
                startConversation.variables ===
                  user.id;

              return (
                <button
                  type="button"
                  key={`user:${user.id}`}
                  onClick={() => {
                    if (isPending) {
                      return;
                    }

                    if (
                      existingConversation &&
                      !existingConversation.archivedAt
                    ) {
                      setActiveConversation(
                        existingConversation
                      );
                      setOpen(false);
                      return;
                    }

                    startConversation.mutate(
                      user.id
                    );
                  }}
                  className="flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.05]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4FF0] to-[#A78BFA] text-lg font-bold text-white shadow-lg">
                    {formatDisplayName(
                      displayName
                    ).charAt(0) || "F"}
                  </div>

                  <div>
                    <h3 className="font-medium text-white">
                      {formatDisplayName(
                        displayName
                      )}
                    </h3>

                    <p className="text-sm text-zinc-500">
                      {formatHandle(
                        user.username
                      )}
                    </p>
                  </div>
                </button>
              );
            }
          )}

          {!filtered.length &&
            !userResults.length &&
            !conversationsQuery.isLoading &&
            !isSearchingUsers && (
            <div className="py-16 text-center text-zinc-500">
              No conversations found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
