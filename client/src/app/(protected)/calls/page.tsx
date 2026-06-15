"use client";

import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Video,
} from "lucide-react";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useEffect, useState, useMemo } from "react";

import { useCallStore } from "@/store/call-store";
import { useNotificationStore } from "@/store/notification-store";
import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useAuthStore } from "@/stores/auth.store";
import FlexAvatar from "@/components/chat/flex-avatar";
import { formatDisplayName } from "@/lib/user-display";
import { formatRelativeTime } from "@/lib/server-time";
import type { Conversation } from "@/types/conversation";
import type { NotificationItem } from "@/store/notification-store";
import FlexLogo from "@/components/shared/flex-logo";

function getCallTarget(conversation: Conversation, currentUserId?: string) {
  if (conversation.type !== "direct") {
    return null;
  }
  return (
    conversation.memberIds?.find((id) => id !== currentUserId) ?? null
  );
}

function getCallAvatar(conversation: Conversation, currentUserId?: string) {
  if (conversation.type !== "direct") {
    return conversation.avatar;
  }
  const target = conversation.members?.find((m) => m.id !== currentUserId);
  return target?.avatar ?? conversation.avatar;
}

export default function CallsPage() {
  const [now, setNow] = useState(() => Date.now());

  const currentUserId = useAuthStore((state) => state.user?.id);
  const { currentCall, phase, startCall } = useCallStore(
    useShallow((state) => ({
      currentCall: state.currentCall,
      phase: state.phase,
      startCall: state.startCall,
    })),
  );

  const notifications = useNotificationStore((state) => state.notifications);
  const conversationsQuery = useConversationsQuery();
  const conversations = useMemo(
    () =>
      (conversationsQuery.data ?? []).filter(
        (conversation) => conversation.type === "direct",
      ),
    [conversationsQuery.data],
  );

  const activeConversation = useMemo(() => {
    if (!currentCall) return null;
    return conversations.find((c) => c.id === currentCall.conversationId);
  }, [currentCall, conversations]);

  const callHistory = useMemo(() => {
    return notifications
      .filter((n) =>
        ["call", "missed_call", "call_accepted", "call_rejected"].includes(
          n.kind ?? "",
        ),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [notifications]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    callHistory.forEach((item) => {
      const date = new Date(item.createdAt);
      if (date >= today) {
        groups.Today.push(item);
      } else if (date >= yesterday) {
        groups.Yesterday.push(item);
      } else {
        groups.Earlier.push(item);
      }
    });

    return groups;
  }, [callHistory, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const getHistoryMeta = (notification: NotificationItem) => {
    switch (notification.kind) {
      case "missed_call":
        return {
          icon: PhoneMissed,
          label: "Missed Call",
          tone: "text-red-400",
        };
      case "call_rejected":
        return {
          icon: PhoneOutgoing,
          label: "Declined Call",
          tone: "text-zinc-500",
        };
      case "call_accepted":
        return {
          icon: PhoneIncoming,
          label: "Connected Call",
          tone: "text-[var(--fc-success)]",
        };
      default:
        return {
          icon: PhoneCall,
          label: "Recent Activity",
          tone: "text-[var(--fc-primary)]",
        };
    }
  };

  return (
    <main className="chat-safe-scroll h-[calc(100dvh-var(--fc-mobile-nav-height,4.75rem))] min-h-[calc(100svh-var(--fc-mobile-nav-height,4.75rem))] overflow-y-auto bg-[var(--fc-app-bg)] px-4 py-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 lg:h-dvh lg:min-h-svh lg:px-8 lg:pb-8 lg:pl-[calc(72px+2rem)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Calls</h1>
            <p className="fc-muted mt-2 text-[15px]">
              Audio, video, and recent activity.
            </p>
          </div>

          <div className="fc-button-soft hidden items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold sm:flex">
            <div className={`h-2 w-2 rounded-full ${phase === "idle" ? "bg-[var(--fc-success)]" : "bg-[var(--fc-primary)] animate-pulse"}`} />
            {phase === "idle" ? "Ready" : "In Progress"}
          </div>
        </header>

        {currentCall ? (
          <section className="fc-surface-strong rounded-[20px] border p-5 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="fc-button-primary flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_12px_40px_rgba(var(--fc-primary-rgb),0.3)]">
                {currentCall.kind === "video" ? <Video size={24} /> : <Phone size={24} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-bold">
                  {formatDisplayName(activeConversation?.name ?? "FlexChat call")}
                </p>
                <p className="fc-muted mt-0.5 text-[13px] font-medium capitalize">
                  {currentCall.kind} call · {phase}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="flex items-center gap-1.5 rounded-full bg-[rgba(var(--fc-primary-rgb),0.12)] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[var(--fc-accent-text)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--fc-primary)] animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
              Quick Call
            </h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {conversations.map((conversation, index) => {
              const targetUserId = getCallTarget(conversation, currentUserId);
              const avatar = getCallAvatar(conversation, currentUserId);

              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.2) }}
                  className="fc-surface fc-touch flex items-center gap-4 rounded-[20px] border p-3.5 transition-all hover:border-[rgba(var(--fc-primary-rgb),0.2)] hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <FlexAvatar
                    src={avatar}
                    name={conversation.name}
                    className="fc-avatar flex h-12 w-12 items-center justify-center overflow-hidden rounded-[14px] text-lg font-bold shadow-lg shadow-black/20"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">
                      {formatDisplayName(conversation.name ?? "Untitled")}
                    </p>
                    <p className="fc-muted mt-0.5 truncate text-[13px] font-medium">
                      {conversation.latestMessage ?? "Recent contact"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void startCall({
                          conversationId: conversation.id,
                          targetUserId: targetUserId!,
                          kind: "voice",
                        });
                      }}
                      disabled={!targetUserId}
                      className="fc-hover flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--fc-app-border)] text-[var(--fc-accent-text)] transition-all hover:border-[var(--fc-primary)] hover:bg-[var(--fc-accent-soft)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-20"
                      aria-label={`Start voice call with ${conversation.name}`}
                    >
                      <Phone size={19} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void startCall({
                          conversationId: conversation.id,
                          targetUserId: targetUserId!,
                          kind: "video",
                        });
                      }}
                      disabled={!targetUserId}
                      className="fc-hover flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--fc-app-border)] text-[var(--fc-accent-text)] transition-all hover:border-[var(--fc-primary)] hover:bg-[var(--fc-accent-soft)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-20"
                      aria-label={`Start video call with ${conversation.name}`}
                    >
                      <Video size={19} />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {!conversationsQuery.isLoading && !conversations.length ? (
              <div className="fc-surface col-span-full rounded-[24px] border border-dashed p-10 text-center">
                <div className="mx-auto mb-5 flex justify-center">
                  <FlexLogo size="lg" variant="soft" />
                </div>
                <p className="text-base font-bold">No call contacts</p>
                <p className="fc-muted mt-2 text-[13px]">
                  Start a conversation first, then call from here.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
              Recents
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            {["Today", "Yesterday", "Earlier"].map((group) => {
              const items = groupedHistory[group] ?? [];

              if (!items.length) {
                return null;
              }

              return (
                <div key={group} className="flex flex-col gap-3">
                  <p className="fc-subtle px-2 text-[11px] font-black uppercase tracking-widest">{group}</p>
                  <div className="grid gap-2">
                    {items.map((notification) => {
                      const meta = getHistoryMeta(notification);
                      const Icon = meta.icon;

                      return (
                        <div
                          key={notification.id}
                          className="fc-surface fc-touch flex items-center gap-4 rounded-[20px] border p-4 transition-colors hover:bg-[rgba(255,255,255,0.01)]"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--fc-app-border)] bg-[rgba(var(--fc-primary-rgb),0.06)]">
                            <Icon size={19} className={meta.tone} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-bold">
                              {meta.label}
                            </p>
                            <p className="fc-muted mt-0.5 truncate text-[13px] font-medium">
                              {notification.message || notification.title}
                            </p>
                          </div>
                          <span className="fc-subtle shrink-0 text-[12px] font-bold">
                            {formatRelativeTime(notification.createdAt, now)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {!callHistory.length ? (
            <div className="fc-surface rounded-[24px] border border-dashed p-10 text-center">
              <div className="mx-auto mb-5 flex justify-center">
                <FlexLogo size="lg" variant="soft" />
              </div>
              <p className="text-base font-bold">Call history is empty</p>
              <p className="fc-muted mt-2 text-[13px]">
                Your recent calls and activity will appear here.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
