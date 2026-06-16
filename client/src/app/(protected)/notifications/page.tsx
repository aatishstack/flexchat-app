"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  PhoneIncoming,
  PhoneMissed,
  UserX,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { useNotificationStore } from "@/store/notification-store";
import type { NotificationItem } from "@/store/notification-store";
import { formatRelativeTime } from "@/lib/server-time";
import { cn } from "@/lib/utils";
import { fetchNotifications } from "@/services/notification.service";

export default function NotificationsPage() {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  const {
    notifications,
    setNotifications,
    markAsRead,
    markAllRead,
    clearNotifications,
  } = useNotificationStore(
    useShallow((state) => ({
      notifications: state.notifications,
      setNotifications: state.setNotifications,
      markAsRead: state.markAsRead,
      markAllRead: state.markAllRead,
      clearNotifications: state.clearNotifications,
    })),
  );

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNotifications();
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    }

    load();
  }, [setNotifications]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach((item) => {
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
  }, [notifications, now]);

  const getMeta = (notification: NotificationItem) => {
    switch (notification.kind) {
      case "missed_call":
        return { icon: PhoneMissed, color: "text-red-400", bg: "bg-red-500/10", route: "/calls" };
      case "call":
      case "call_accepted":
        return { icon: PhoneIncoming, color: "text-[var(--fc-success)]", bg: "bg-[var(--fc-success)]/10", route: "/calls" };
      case "block":
        return { icon: UserX, color: "text-amber-400", bg: "bg-amber-500/10", route: "/privacy" };
      default:
        return { icon: Bell, color: "text-[#7C4FF0]", bg: "bg-[#7C4FF0]/10", route: "/chat" };
    }
  };

  const handleAction = (notification: NotificationItem) => {
    markAsRead(notification.id);
    const meta = getMeta(notification);
    router.push(meta.route);
  };

  return (
    <main className="fc-no-scrollbar h-dvh overflow-y-auto bg-[#0C0C10] pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <header className="px-1 mb-8 flex items-center justify-between">
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Notifications
          </h1>
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-[12px] font-bold text-[#7C4FF0] hover:opacity-80 transition-opacity"
            >
              Mark all as read
            </button>
          )}
        </header>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
              <Bell size={28} className="text-white/10" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">No notifications</h2>
            <p className="text-white/30 text-sm leading-relaxed max-w-[240px]">
              Your missed calls, mentions, and activity will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {["Today", "Yesterday", "Earlier"].map((group) => {
              const items = groupedNotifications[group];
              if (!items.length) return null;

              return (
                <div key={group} className="space-y-4">
                  <div className="px-1">
                    <span className="text-[10.5px] font-bold tracking-[0.15em] uppercase text-white/25">{group}</span>
                  </div>
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {items.map((notification) => {
                        const meta = getMeta(notification);
                        const Icon = meta.icon;

                        return (
                          <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -10 }}
                            onClick={() => handleAction(notification)}
                            className={cn(
                              "relative flex items-start gap-4 p-5 rounded-[28px] cursor-pointer hover:bg-white/[0.04] transition-all active:scale-[0.99] border border-white/[0.02]",
                              notification.read ? "bg-[#16161D]/50" : "bg-[#16161D] shadow-sm"
                            )}
                          >
                            {!notification.read && (
                              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full bg-[#7C4FF0]" />
                            )}
                            
                            <div className={cn(
                              "w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center",
                              meta.bg,
                              meta.color
                            )}>
                              <Icon size={20} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <h3 className={cn(
                                  "text-[15.5px] font-bold truncate tracking-tight",
                                  notification.read ? "text-white/70" : "text-white"
                                )}>
                                  {notification.title}
                                </h3>
                                <span className="shrink-0 text-[10.5px] font-bold text-white/20 uppercase tracking-tighter">
                                  {formatRelativeTime(notification.createdAt, now)}
                                </span>
                              </div>
                              <p className={cn(
                                "text-[13.5px] leading-relaxed line-clamp-2 font-medium",
                                notification.read ? "text-white/30" : "text-white/50"
                              )}>
                                {notification.message}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
            
            {notifications.length > 0 && (
              <div className="pt-4 pb-10">
                <button
                  onClick={clearNotifications}
                  className="w-full py-4 rounded-2xl border border-white/[0.03] text-[13px] font-bold text-white/20 hover:text-red-400/50 hover:bg-red-500/[0.02] transition-all"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
