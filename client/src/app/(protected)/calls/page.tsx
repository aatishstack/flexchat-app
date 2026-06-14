"use client";

import {
  Clock3,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Video,
} from "lucide-react";
import { motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";

import FlexAvatar from "@/components/chat/flex-avatar";
import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useServerNow } from "@/hooks/use-server-now";
import { formatDisplayName } from "@/lib/user-display";
import { useCallStore, type CallKind } from "@/store/call-store";
import {
  useNotificationStore,
  type NotificationItem,
} from "@/store/notification-store";
import { useAuthStore } from "@/stores/auth.store";
import type { Conversation } from "@/types/conversation";

const CALL_NOTIFICATION_KINDS = new Set([
  "call",
  "missed_call",
  "call_accepted",
  "call_rejected",
]);

function getCallTarget(conversation: Conversation, currentUserId?: string) {
  return conversation.memberIds?.find((memberId) => memberId !== currentUserId);
}

function getCallAvatar(conversation: Conversation, currentUserId?: string) {
  return (
    conversation.avatar ??
    conversation.members?.find(
      (member) => member.id !== currentUserId && member.avatar,
    )?.avatar ??
    null
  );
}

function formatRelativeTime(value: string, now: number) {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "";
  }

  const minutes = Math.max(0, Math.round((now - time) / 60_000));

  if (minutes < 1) {
    return "Now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);

  return `${days}d ago`;
}

function getHistoryGroup(value: string, now: number) {
  const date = new Date(value);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);

  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return "Today";
  }

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }

  return "Earlier";
}

function getHistoryMeta(notification: NotificationItem) {
  const title = notification.title.toLowerCase();
  const message = notification.message.toLowerCase();
  const video =
    title.includes("video") || message.includes("video");

  if (notification.kind === "missed_call") {
    return {
      label: video ? "Missed video call" : "Missed audio call",
      tone: "text-red-200",
      icon: PhoneMissed,
    };
  }

  if (notification.kind === "call_accepted") {
    return {
      label: video ? "Video call connected" : "Audio call connected",
      tone: "text-[var(--fc-success)]",
      icon: PhoneIncoming,
    };
  }

  if (notification.kind === "call_rejected") {
    return {
      label: video ? "Video call declined" : "Audio call declined",
      tone: "text-amber-200",
      icon: PhoneOutgoing,
    };
  }

  return {
    label: video ? "Video call" : "Audio call",
    tone: "text-[var(--fc-accent-text)]",
    icon: video ? Video : Phone,
  };
}

export default function CallsPage() {
  const now = useServerNow();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const conversationsQuery = useConversationsQuery();
  const notifications = useNotificationStore((state) => state.notifications);
  const { currentCall, phase, startCall } = useCallStore(
    useShallow((state) => ({
      currentCall: state.currentCall,
      phase: state.phase,
      startCall: state.startCall,
    })),
  );

  const conversations = (conversationsQuery.data ?? []).slice(0, 32);
  const activeConversation = currentCall
    ? conversationsQuery.data?.find(
        (conversation) => conversation.id === currentCall.conversationId,
      )
    : null;
  const callHistory = notifications
    .filter(
      (notification) =>
        notification.kind && CALL_NOTIFICATION_KINDS.has(notification.kind),
    )
    .slice(0, 60);
  const groupedHistory = callHistory.reduce<Record<string, NotificationItem[]>>(
    (groups, notification) => {
      const group = getHistoryGroup(notification.createdAt, now);

      groups[group] = groups[group] ?? [];
      groups[group].push(notification);

      return groups;
    },
    {},
  );

  async function startConversationCall(
    conversation: Conversation,
    kind: CallKind,
  ) {
    const targetUserId = getCallTarget(conversation, currentUserId);

    if (!targetUserId) {
      return;
    }

    await startCall({
      conversationId: conversation.id,
      targetUserId,
      kind,
    });
  }

  return (
    <main className="chat-safe-scroll h-[calc(100dvh-var(--fc-mobile-nav-height,4.75rem))] min-h-[calc(100svh-var(--fc-mobile-nav-height,4.75rem))] overflow-y-auto bg-[var(--fc-app-bg)] px-4 py-[calc(1rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 lg:h-dvh lg:min-h-svh lg:px-8 lg:pb-8 lg:pl-[calc(72px+2rem)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calls</h1>
            <p className="fc-muted mt-1 text-sm">
              Audio, video, and recent call activity.
            </p>
          </div>

          <div className="fc-button-soft hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium sm:flex">
            <Clock3 size={14} />
            {phase === "idle" ? "Ready" : "Call in progress"}
          </div>
        </header>

        {currentCall ? (
          <section className="fc-panel-strong rounded-2xl border p-4 shadow-lg shadow-black/10">
            <div className="flex items-center gap-4">
              <div className="fc-button-primary flex h-12 w-12 items-center justify-center rounded-2xl">
                {currentCall.kind === "video" ? <Video size={21} /> : <Phone size={21} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {formatDisplayName(activeConversation?.name ?? "FlexChat call")}
                </p>
                <p className="fc-muted mt-1 text-xs capitalize">
                  {currentCall.kind} call · {phase}
                </p>
              </div>
              <span className="rounded-full bg-[rgba(var(--fc-primary-rgb),0.16)] px-3 py-1.5 text-xs font-semibold text-[var(--fc-accent-text)]">
                Live
              </span>
            </div>
          </section>
        ) : null}

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fc-text-subtle)]">
              Start A Call
            </h2>
          </div>

          <div className="grid gap-2">
            {conversations.map((conversation, index) => {
              const targetUserId = getCallTarget(conversation, currentUserId);
              const avatar = getCallAvatar(conversation, currentUserId);

              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.18) }}
                  className="fc-surface flex items-center gap-3 rounded-2xl border p-3"
                >
                  <FlexAvatar
                    src={avatar}
                    name={conversation.name}
                    className="fc-avatar flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-base font-bold"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {formatDisplayName(conversation.name ?? "Untitled")}
                    </p>
                    <p className="fc-muted mt-1 truncate text-xs">
                      {conversation.latestMessage ?? "No recent messages"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void startConversationCall(conversation, "voice");
                      }}
                      disabled={!targetUserId}
                      className="fc-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--fc-app-border)] text-[var(--fc-accent-text)] transition disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Start audio call with ${conversation.name}`}
                    >
                      <Phone size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void startConversationCall(conversation, "video");
                      }}
                      disabled={!targetUserId}
                      className="fc-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--fc-app-border)] text-[var(--fc-accent-text)] transition disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Start video call with ${conversation.name}`}
                    >
                      <Video size={17} />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {!conversationsQuery.isLoading && !conversations.length ? (
              <div className="fc-surface rounded-2xl border p-6 text-center">
                <PhoneCall
                  size={28}
                  className="mx-auto text-[var(--fc-text-subtle)]"
                />
                <p className="mt-3 text-sm font-medium">No call contacts yet</p>
                <p className="fc-muted mt-1 text-xs">
                  Start a conversation first, then call from here.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fc-text-subtle)]">
            Recent
          </h2>

          {["Today", "Yesterday", "Earlier"].map((group) => {
            const items = groupedHistory[group] ?? [];

            if (!items.length) {
              return null;
            }

            return (
              <div key={group} className="grid gap-2">
                <p className="fc-subtle px-1 text-xs font-medium">{group}</p>
                {items.map((notification) => {
                  const meta = getHistoryMeta(notification);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={notification.id}
                      className="fc-surface flex items-center gap-3 rounded-2xl border p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--fc-app-border)] bg-[rgba(var(--fc-primary-rgb),0.09)]">
                        <Icon size={17} className={meta.tone} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {meta.label}
                        </p>
                        <p className="fc-muted mt-1 truncate text-xs">
                          {notification.message || notification.title}
                        </p>
                      </div>
                      <span className="fc-subtle shrink-0 text-xs">
                        {formatRelativeTime(notification.createdAt, now)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {!callHistory.length ? (
            <div className="fc-surface rounded-2xl border p-6 text-center">
              <PhoneCall
                size={28}
                className="mx-auto text-[var(--fc-text-subtle)]"
              />
              <p className="mt-3 text-sm font-medium">No recent calls</p>
              <p className="fc-muted mt-1 text-xs">
                Missed, connected, and declined calls will appear here.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
