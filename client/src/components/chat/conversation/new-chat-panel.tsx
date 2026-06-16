"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Loader2,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useDiscoverUsersQuery } from "@/hooks/queries/use-users-query";
import {
  upsertConversationInQueryCache,
} from "@/lib/conversation-query-cache";
import FlexAvatar from "@/components/chat/flex-avatar";
import FlexLogo from "@/components/shared/flex-logo";
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
import { cn } from "@/lib/utils";

type NewChatPanelProps = {
  variant?: "rail" | "sheet" | "page";
  onClose?: () => void;
};

export default function NewChatPanel({
  variant = "page",
  onClose,
}: NewChatPanelProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  
  const currentUserId = useAuthStore((state) => state.user?.id);
  const setActiveConversation = useConversationStore((state) => state.setActiveConversation);
  
  const conversationsQuery = useConversationsQuery();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  const discoverQuery = useDiscoverUsersQuery(debouncedSearch);

  // Derive existing contacts from active direct conversations
  const directContacts = useMemo(() => {
    return (conversationsQuery.data ?? [])
      .filter((conversation) => conversation.type === "direct")
      .map((conversation) => {
        const member = conversation.members?.find((item) => item.id !== currentUserId);
        const memberId = member?.id ?? conversation.memberIds?.find((item) => item !== currentUserId) ?? conversation.id;

        return {
          id: memberId,
          username: member?.username ?? conversation.name ?? "FlexChat user",
          avatar: member?.avatar ?? conversation.avatar ?? null,
          lastSeenAt: member?.lastSeenAt ?? null,
          conversation,
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [conversationsQuery.data, currentUserId]);

  // Fast local filtering
  const normalizedSearch = debouncedSearch.trim().toLowerCase();
  const filteredLocalContacts = useMemo(() => {
    if (!normalizedSearch) return directContacts;
    return directContacts.filter((contact) =>
      contact.username.toLowerCase().includes(normalizedSearch)
    );
  }, [directContacts, normalizedSearch]);

  // Identify network users that are not already contacts
  const networkUsers = useMemo(() => {
    if (!discoverQuery.data) return [];
    const contactIds = new Set(directContacts.map(c => c.id));
    return discoverQuery.data.filter(u => !contactIds.has(u.id));
  }, [discoverQuery.data, directContacts]);

  const startConversation = useMutation({
    mutationFn: createDirectConversation,
    onSuccess: (conversation) => {
      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) => upsertConversationInQueryCache(cache, conversation)
      );
      setActiveConversation(conversation);
      
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      if (onClose) onClose();
      else router.push("/chat");
    },
    onError: () => {
      pushToast({
        title: "Connection failed",
        message: "Could not start conversation. Please try again.",
        variant: "error",
      });
    },
  });

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  const isSearchActive = normalizedSearch.length > 0;
  const isGlobalLoading = discoverQuery.isLoading || conversationsQuery.isLoading;

  return (
    <div className={cn(
      "flex h-full w-full flex-col bg-[var(--fc-app-bg)] text-[var(--fc-theme-text)]",
      variant === "rail" && "border-r border-[var(--fc-app-border)]"
    )}>
      <header className="shrink-0 border-b border-[var(--fc-app-border)] bg-black px-4 pb-4 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleClose}
            className="fc-hover flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-zinc-300 transition hover:bg-white/[0.06]"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">New Message</h1>
        </div>

        <div className="relative mt-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fc-text-subtle)]" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts or usernames"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-[15px] font-bold text-white outline-none transition focus:border-[var(--fc-primary)]/40 focus:bg-white/[0.05]"
          />
        </div>
      </header>

      <div className="chat-safe-scroll flex-1 overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {!isSearchActive && (
          <div className="p-4 sm:p-6">
            <button
              type="button"
              disabled
              className="fc-surface mb-6 flex w-full items-center gap-4 rounded-2xl border border-white/5 p-4 text-left opacity-40 grayscale cursor-not-allowed"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">New Group</h3>
                <p className="mt-0.5 text-xs font-medium text-[var(--fc-text-subtle)]">Group chats are not available yet</p>
              </div>
            </button>

            <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
              Your Contacts
            </h2>
            
            {conversationsQuery.isLoading ? (
               <div className="space-y-2">
                 {[1, 2, 3, 4].map((i) => (
                   <div key={i} className="h-[72px] animate-pulse rounded-[20px] bg-white/[0.03]" />
                 ))}
               </div>
            ) : directContacts.length > 0 ? (
              <div className="space-y-2">
                {directContacts.map((contact) => (
                  <motion.button
                    key={contact.id}
                    type="button"
                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setActiveConversation(contact.conversation);
                      handleClose();
                    }}
                    className="fc-surface fc-touch flex w-full items-center gap-4 rounded-[20px] border border-white/5 p-3 text-left transition hover:bg-white/[0.04]"
                  >
                    <FlexAvatar
                      src={contact.avatar}
                      name={contact.username}
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--fc-app-panel-strong)] text-lg font-black text-white border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-bold text-white/90">
                        {formatDisplayName(contact.username)}
                      </h3>
                      <p className="truncate text-xs font-medium text-[var(--fc-text-subtle)]">
                        {formatHandle(contact.username)}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FlexLogo size="lg" variant="soft" className="mb-4" />
                <p className="text-[15px] font-bold text-white/80">No contacts yet</p>
                <p className="fc-muted mt-1 max-w-[240px] text-xs">
                  Search for a username above to start your first conversation.
                </p>
              </div>
            )}
          </div>
        )}

        {isSearchActive && (
          <div className="p-4 sm:p-6">
            {filteredLocalContacts.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
                  My Contacts
                </h2>
                <div className="space-y-2">
                  {filteredLocalContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => {
                        setActiveConversation(contact.conversation);
                        handleClose();
                      }}
                      className="fc-surface fc-touch flex w-full items-center gap-4 rounded-[20px] border border-white/5 p-3 text-left transition hover:bg-white/[0.04]"
                    >
                      <FlexAvatar
                        src={contact.avatar}
                        name={contact.username}
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--fc-app-panel-strong)] text-lg font-black text-white border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-bold text-white/90">
                          {formatDisplayName(contact.username)}
                        </h3>
                        <p className="truncate text-xs font-medium text-[var(--fc-text-subtle)]">
                          {formatHandle(contact.username)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
                People
              </h2>
              
              {isGlobalLoading ? (
                 <div className="space-y-2">
                   {[1, 2].map((i) => (
                     <div key={i} className="h-[72px] animate-pulse rounded-[20px] bg-white/[0.03]" />
                   ))}
                 </div>
              ) : networkUsers.length > 0 ? (
                <div className="space-y-2">
                  {networkUsers.map((user) => {
                    const isPending = startConversation.variables === user.id && startConversation.isPending;

                    return (
                      <div
                        key={user.id}
                        className="fc-surface flex items-center justify-between gap-4 rounded-[20px] border border-white/5 p-3 transition hover:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <FlexAvatar
                            src={user.avatar}
                            name={user.username}
                            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--fc-primary)] to-[#6D28D9] text-lg font-black text-white shadow-md"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-bold text-white/90">
                              {formatDisplayName(user.username)}
                            </h3>
                            <p className="truncate text-xs font-medium text-[var(--fc-text-subtle)]">
                              {formatHandle(user.username)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => startConversation.mutate(user.id)}
                          disabled={isPending}
                          className="fc-touch flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--fc-primary)]/10 text-[var(--fc-primary)] transition hover:bg-[var(--fc-primary)]/20 disabled:opacity-50"
                          aria-label={`Start chat with ${user.username}`}
                        >
                          {isPending ? (
                            <Loader2 size={18} className="motion-safe:animate-spin" />
                          ) : (
                            <UserPlus size={18} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-70">
                  <p className="text-[13px] font-bold text-white/80">No people found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
