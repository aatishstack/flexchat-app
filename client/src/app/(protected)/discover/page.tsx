"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  QrCode,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import FlexLogo from "@/components/shared/flex-logo";

function DiscoverSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-4", className)}>
      <div className="px-1">
        <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
          {title}
        </h2>
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const setActiveConversation = useConversationStore(
    (state) => state.setActiveConversation
  );
  const conversationsQuery = useConversationsQuery();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const discoverQuery = useDiscoverUsersQuery(debouncedSearch);

  const directConversationByUserId = useMemo(() => {
    const map = new Map<string, Conversation>();
    conversationsQuery.data?.forEach((conversation) => {
      if (conversation.type !== "direct") return;
      conversation.memberIds?.forEach((memberId) => {
        if (memberId !== currentUserId) {
          map.set(memberId, conversation);
        }
      });
    });
    return map;
  }, [conversationsQuery.data, currentUserId]);

  const startConversation = useMutation({
    mutationFn: createDirectConversation,
    onSuccess: (conversation) => {
      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) => upsertConversationInQueryCache(cache, conversation)
      );
      setActiveConversation(conversation);
      router.push("/chat");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
    onError: () => {
      pushToast({
        title: "Connection failed",
        message: "Could not start conversation. Please try again.",
        variant: "error",
      });
    },
  });

  const dismissUser = useMutation({
    mutationFn: dismissDiscoverUser,
    onMutate: async (userId) => {
      const queryKey = queryKeys.users.discover(debouncedSearch.trim().toLowerCase());
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<PublicUser[]>(queryKey, (current) =>
        current?.filter((u) => u.id !== userId) ?? []
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.users.discover(debouncedSearch.trim().toLowerCase()),
      });
    },
  });

  const users = discoverQuery.data ?? [];
  const searchActive = debouncedSearch.trim().length > 0;
  const newlyJoinedUsers = users.filter(
    (user) => !directConversationByUserId.has(user.id)
  );

  return (
    <main className="fc-no-scrollbar h-dvh overflow-y-auto bg-[#0C0C10] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <FlexLogo size="md" />
               <h1 className="text-4xl font-black tracking-tight">Discover</h1>
            </div>
            <div className="fc-button-soft hidden rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--fc-text-subtle)] sm:block">
              Network v1.0
            </div>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fc-text-subtle)]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or handle..."
              className="h-14 w-full rounded-2xl border border-white/10 bg-[var(--fc-app-surface)] pl-12 pr-4 text-sm font-bold text-white outline-none transition focus:border-[var(--fc-primary)]/40 focus:ring-4 focus:ring-[var(--fc-primary)]/5"
            />
          </div>
        </header>

        <div className="grid gap-10">
          {!searchActive && (
            <>
              <DiscoverSection title="Quick Actions">
                <div className="grid grid-cols-2 gap-4">
                  <button className="fc-surface fc-touch flex flex-col items-center justify-center gap-3 rounded-[24px] border p-6 text-center transition hover:border-[var(--fc-primary)]/30 hover:bg-white/[0.01]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--fc-primary)]/10 text-[var(--fc-primary)] shadow-sm">
                      <QrCode size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest">QR Sync</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[var(--fc-text-subtle)]">Scan to add</p>
                    </div>
                  </button>
                  <button className="fc-surface fc-touch flex flex-col items-center justify-center gap-3 rounded-[24px] border p-6 text-center transition hover:border-[var(--fc-primary)]/30 hover:bg-white/[0.01]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-white/90 shadow-sm">
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest">Requests</p>
                      <p className="mt-0.5 text-[11px] font-medium text-[var(--fc-text-subtle)]">Pending invites</p>
                    </div>
                  </button>
                </div>
              </DiscoverSection>

              <DiscoverSection title="New on FlexChat">
                {discoverQuery.isLoading ? (
                  <div className="grid gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {newlyJoinedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="fc-surface group flex items-center justify-between gap-4 rounded-[22px] border p-4 transition hover:bg-white/[0.01]"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <FlexAvatar
                            src={user.avatar}
                            name={user.username}
                            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--fc-primary)] to-[#6D28D9] text-lg font-black text-white shadow-lg"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-bold text-white/90">
                              {formatDisplayName(user.username)}
                            </h3>
                            <p className="truncate text-xs font-medium text-[var(--fc-text-muted)] group-hover:text-[var(--fc-text-subtle)]">
                              {formatHandle(user.username)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startConversation.mutate(user.id)}
                            disabled={startConversation.isPending}
                            className="fc-touch flex h-10 px-4 items-center justify-center rounded-xl bg-[var(--fc-primary)] text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.2)] transition hover:bg-[var(--fc-primary-hover)] active:scale-95 disabled:opacity-50"
                          >
                            Connect
                          </button>
                          <button
                            onClick={() => dismissUser.mutate(user.id)}
                            className="fc-hover flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-[var(--fc-text-subtle)] transition hover:text-red-400"
                            aria-label="Dismiss"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DiscoverSection>
            </>
          )}

          {searchActive && (
            <DiscoverSection title="Network Results">
              {discoverQuery.isLoading ? (
                <div className="grid gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : users.length ? (
                <div className="grid gap-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="fc-surface group flex items-center justify-between gap-4 rounded-[22px] border p-4 transition hover:bg-white/[0.01]"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <FlexAvatar
                          src={user.avatar}
                          name={user.username}
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-black text-lg font-black text-white border border-white/10 shadow-xl"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate text-[15px] font-bold text-white/90">
                            {formatDisplayName(user.username)}
                          </h3>
                          <p className="truncate text-xs font-medium text-[var(--fc-text-muted)] group-hover:text-[var(--fc-text-subtle)]">
                            {formatHandle(user.username)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => startConversation.mutate(user.id)}
                        className="fc-touch flex h-10 px-5 items-center justify-center rounded-xl border border-[var(--fc-primary)]/30 bg-[var(--fc-primary)]/5 text-[12px] font-black uppercase tracking-widest text-[var(--fc-primary)] transition hover:bg-[var(--fc-primary)]/10"
                      >
                        Message
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <div className="mx-auto mb-5">
                    <FlexLogo size="lg" variant="soft" />
                  </div>
                  <p className="text-base font-bold text-white/80">No results for &quot;{debouncedSearch}&quot;</p>
                  <p className="fc-muted mt-1 text-sm">Check the username spelling and try again.</p>
                </div>
              )}
            </DiscoverSection>
          )}
        </div>
      </div>
    </main>
  );
}
