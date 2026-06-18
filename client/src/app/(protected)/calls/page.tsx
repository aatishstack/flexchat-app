"use client";

import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Video,
  Plus,
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
  const [tab, setTab] = useState<"All" | "Missed">("All");

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

  const filteredHistory = useMemo(() => {
    if (tab === "Missed") {
      return callHistory.filter((n) => n.kind === "missed_call");
    }
    return callHistory;
  }, [callHistory, tab]);

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

    filteredHistory.forEach((item) => {
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
  }, [filteredHistory, now]);

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
          icon: PhoneOutgoing,
          label: "Audio Call",
          tone: "text-white/40",
        };
    }
  };

  return (
    <main className="fc-no-scrollbar h-dvh overflow-y-auto bg-[#0C0C10] pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between px-5 pt-2 pb-3 mb-1">
        <h1 className="text-[22px] font-extrabold text-white">Calls</h1>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] text-white"
          onClick={() => {
            // Trigger quick call options selector if needed
          }}
        >
          <Plus size={18} className="text-white/60" />
        </button>
      </div>

      <div className="flex gap-1 mx-5 mb-4 p-1 rounded-xl bg-white/[0.05]">
        {(["All", "Missed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-[13px] font-bold transition-colors"
            style={{
              background: tab === t ? "#7C4FF0" : "transparent",
              color: tab === t ? "white" : "rgba(255,255,255,0.38)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* Quick Call Section */}
        <div>
          <div className="px-5 mb-3">
            <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-white/28">Quick Call</span>
          </div>
          <div className="mx-5 space-y-2">
            {conversations.slice(0, 4).map((conversation, index) => {
              const targetUserId = getCallTarget(conversation, currentUserId);
              const avatar = getCallAvatar(conversation, currentUserId);

              return (
                <div 
                  key={conversation.id}
                  className="flex items-center gap-4 p-3.5 rounded-[22px] bg-[#16161D] border border-white/[0.05] shadow-sm hover:bg-[#1E1E27] transition-colors"
                >
                  <div className="w-13 h-13 rounded-full overflow-hidden flex-shrink-0 bg-[#0C0C10] border border-white/5">
                    <FlexAvatar
                      src={avatar}
                      name={conversation.name}
                      className="h-full w-full text-lg font-bold"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-bold text-white truncate">{formatDisplayName(conversation.name ?? "Untitled")}</div>
                    <div className="text-[12.5px] text-white/30 font-medium mt-0.5">Contact</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => void startCall({ conversationId: conversation.id, targetUserId: targetUserId!, kind: "voice" })}
                      className="w-11 h-11 rounded-full flex items-center justify-center bg-white/[0.05] text-[#7C4FF0] hover:bg-white/[0.08] active:scale-95 transition-all"
                    >
                      <Phone size={19} />
                    </button>
                    <button 
                      onClick={() => void startCall({ conversationId: conversation.id, targetUserId: targetUserId!, kind: "video" })}
                      className="w-11 h-11 rounded-full flex items-center justify-center bg-white/[0.05] text-[#7C4FF0] hover:bg-white/[0.08] active:scale-95 transition-all"
                    >
                      <Video size={19} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recents Section */}
        <div>
          <div className="px-5 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/28">Recent History</span>
          </div>
          <div className="space-y-4">
            {["Today", "Yesterday", "Earlier"].map((group) => {
              const items = groupedHistory[group] ?? [];
              if (!items.length) return null;

              return (
                <div key={group} className="space-y-0.5">
                  <div className="px-5 py-1.5">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{group}</span>
                  </div>
                  <div className="flex flex-col">
                    {items.map((notification) => {
                      const meta = getHistoryMeta(notification);
                      const Icon = meta.icon;

                      return (
                        <div key={notification.id} className="flex items-center gap-3.5 px-5 py-3 hover:bg-white/[0.03] transition-colors">
                          <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-white/[0.04]">
                            <Icon size={18} className={meta.tone} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <h3 className="text-[14.5px] font-semibold text-white truncate">{meta.label}</h3>
                              <span className="shrink-0 text-[12px] text-white/32 font-medium">
                                {formatRelativeTime(notification.createdAt, now)}
                              </span>
                            </div>
                            <p className="text-[12px] text-white/40 font-medium truncate">
                              {notification.message || notification.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {!filteredHistory.length && (
        <div className="flex flex-col items-center justify-center py-32 text-center px-10">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
            <Phone size={28} className="text-white/10" />
          </div>
          <p className="text-white/30 text-sm">Your call history will appear here.</p>
        </div>
      )}
    </main>
  );
}
