"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  Check,
  ChevronRight,
  PhoneIncoming,
  PhoneMissed,
  Trash2,
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
import FlexLogo from "@/components/shared/flex-logo";
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
    deleteNotification,
    clearNotifications,
  } = useNotificationStore(
    useShallow((state) => ({
      notifications: state.notifications,
      setNotifications: state.setNotifications,
      markAsRead: state.markAsRead,
      markAllRead: state.markAllRead,
      deleteNotification: state.deleteNotification,
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
        return { icon: Bell, color: "text-[var(--fc-primary)]", bg: "bg-[var(--fc-primary)]/10", route: "/chat" };
    }
  };

  const handleAction = (notification: NotificationItem) => {
    markAsRead(notification.id);
    const meta = getMeta(notification);
    router.push(meta.route);
  };

  return (
    <main className="chat-safe-scroll h-[calc(100dvh-var(--fc-mobile-nav-height,4.75rem))] min-h-[calc(100svh-var(--fc-mobile-nav-height,4.75rem))] overflow-y-auto bg-[var(--fc-app-bg)] px-4 py-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 lg:h-dvh lg:min-h-svh lg:px-8 lg:pb-8 lg:pl-[calc(72px+2rem)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <FlexLogo size="md" />
            <h1 className="text-3xl font-bold tracking-tight">Center</h1>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="fc-hover flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-zinc-400 transition hover:text-red-400"
                aria-label="Clear all"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={markAllRead}
              className="fc-button-soft rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--fc-text-subtle)] backdrop-blur-3xl"
            >
              Mark All Read
            </button>
          </div>
        </header>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mx-auto mb-6">
              <FlexLogo size="xl" variant="soft" />
            </div>
            <h2 className="text-xl font-bold text-white/90">Quiet for now</h2>
            <p className="fc-muted mt-2 max-w-xs text-sm">
              Your communications, security alerts, and system events will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {["Today", "Yesterday", "Earlier"].map((group) => {
              const items = groupedNotifications[group];
              if (!items.length) return null;

              return (
                <section key={group} className="grid gap-4">
                  <div className="px-1">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--fc-text-subtle)]">
                      {group}
                    </h2>
                  </div>
                  <div className="grid gap-2">
                    <AnimatePresence initial={false}>
                      {items.map((notification) => {
                        const meta = getMeta(notification);
                        const Icon = meta.icon;

                        return (
                          <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn(
                              "fc-surface group relative flex items-start gap-4 rounded-[24px] border p-4 transition-all hover:bg-white/[0.01]",
                              !notification.read ? "border-[var(--fc-primary)]/20" : "border-white/5"
                            )}
                          >
                            {!notification.read && (
                              <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[var(--fc-primary)] shadow-[0_0_12px_rgba(var(--fc-primary-rgb),0.5)]" />
                            )}
                            
                            <div className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/5 shadow-sm",
                              meta.bg,
                              meta.color
                            )}>
                              <Icon size={22} />
                            </div>

                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className={cn(
                                  "truncate text-[15px] font-bold",
                                  !notification.read ? "text-white" : "text-zinc-400"
                                )}>
                                  {notification.title}
                                </h3>
                                <span className="shrink-0 text-[11px] font-bold text-[var(--fc-text-subtle)]">
                                  {formatRelativeTime(notification.createdAt, now)}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-relaxed text-[var(--fc-text-muted)] group-hover:text-zinc-300">
                                {notification.message}
                              </p>

                              <div className="mt-4 flex items-center gap-2">
                                <button
                                  onClick={() => handleAction(notification)}
                                  className="fc-touch flex h-9 items-center gap-2 rounded-xl bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                                >
                                  View Details
                                  <ChevronRight size={14} />
                                </button>
                                {!notification.read && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="fc-hover flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fc-primary)]/10 text-[var(--fc-primary)] transition hover:bg-[var(--fc-primary)]/20"
                                    aria-label="Mark as read"
                                  >
                                    <Check size={16} strokeWidth={3} />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="fc-hover flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:text-red-400"
                                  aria-label="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
