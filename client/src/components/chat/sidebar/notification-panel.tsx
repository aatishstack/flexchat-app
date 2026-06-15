"use client";

import {
  Bell,
  CheckCheck,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import {
  clearNotificationsRequest,
  deleteNotificationRequest,
  markNotificationRead,
  markNotificationsRead,
} from "@/services/notification.service";
import { useNotificationStore } from "@/store/notification-store";
import { useToastStore } from "@/store/toast-store";

type Props = {
  onClose?: () => void;
};

const NOTIFICATION_TIME_FORMATTER =
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

function formatNotificationTime(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return NOTIFICATION_TIME_FORMATTER.format(
    date
  );
}

export default function NotificationPanel({
  onClose,
}: Props) {
  const notifications =
    useNotificationStore(
      (state) =>
        state.notifications
    );

  const markAllRead =
    useNotificationStore(
      (state) =>
        state.markAllRead
    );
  const markAsRead =
    useNotificationStore(
      (state) =>
        state.markAsRead
    );
  const markAsUnread =
    useNotificationStore(
      (state) =>
        state.markAsUnread
    );
  const deleteNotification =
    useNotificationStore(
      (state) =>
        state.deleteNotification
    );
  const clearNotifications =
    useNotificationStore(
      (state) =>
        state.clearNotifications
    );
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const unreadCount =
    notifications.reduce(
      (count, notification) =>
        notification.read
          ? count
          : count + 1,
      0
    );

  async function handleMarkAllRead() {
    try {
      await markNotificationsRead();
      markAllRead();
    } catch {
      pushToast({
        title:
          "Notifications unavailable",
        message:
          "We could not sync read state right now.",
        variant: "warning",
      });
      markAllRead();
    }
  }

  async function handleToggleRead(
    notificationId: string,
    read: boolean
  ) {
    if (read) {
      markAsRead(notificationId);
    } else {
      markAsUnread(notificationId);
    }

    try {
      await markNotificationRead(
        notificationId,
        read
      );
    } catch {
      pushToast({
        title:
          "Notification sync delayed",
        message:
          "Your local state was updated and will refresh later.",
        variant: "warning",
      });
    }
  }

  async function handleDeleteNotification(
    notificationId: string
  ) {
    deleteNotification(notificationId);

    try {
      await deleteNotificationRequest(
        notificationId
      );
    } catch {
      pushToast({
        title:
          "Notification removed locally",
        message:
          "Server sync will catch up on refresh.",
        variant: "warning",
      });
    }
  }

  async function handleClearNotifications() {
    if (!notifications.length) {
      return;
    }

    clearNotifications();

    try {
      await clearNotificationsRequest();
    } catch {
      pushToast({
        title:
          "Notifications cleared locally",
        message:
          "Server sync will catch up on refresh.",
        variant: "warning",
      });
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-black">
      <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--fc-primary)]/10 bg-[var(--fc-primary)]/5 text-[var(--fc-primary)]">
            <Bell size={21} />
          </div>

          <div>
            <h2 className="text-[17px] font-bold text-white">
              Notifications
            </h2>

            <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--fc-text-subtle)]">
              Activity & Alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleMarkAllRead();
            }}
            disabled={!unreadCount}
            className="fc-touch flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Mark all notifications as read"
          >
            <CheckCheck size={19} />
          </button>

          <button
            type="button"
            onClick={() => {
              void handleClearNotifications();
            }}
            disabled={!notifications.length}
            className="fc-touch flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-zinc-400 transition-all hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Clear notifications"
          >
            <Trash2 size={18} />
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="fc-touch flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-zinc-300 transition-all hover:bg-white/[0.06]"
              aria-label="Close notifications"
            >
              <X size={19} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="chat-safe-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {!notifications.length && (
          <div className="flex h-full items-center justify-center text-sm font-bold text-[var(--fc-text-subtle)]">
            Nothing to see here
          </div>
        )}

        {notifications.map(
          (
            notification
          ) => (
            <div
              key={
                notification.id
              }
              className="w-full rounded-[20px] border border-white/5 bg-[var(--fc-app-surface)] p-5 text-left transition hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-left min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-white/90">
                    {
                      notification.title
                    }
                  </h3>

                  <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--fc-text-muted)]">
                    {
                      notification.message
                    }
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleRead(
                        notification.id,
                        !notification.read
                      );
                    }}
                    className="fc-touch flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label={
                      notification.read
                        ? "Mark notification unread"
                        : "Mark notification read"
                    }
                  >
                    {notification.read ? (
                      <RotateCcw size={15} />
                    ) : (
                      <CheckCheck size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteNotification(
                        notification.id
                      );
                    }}
                    className="fc-touch flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={15} />
                  </button>

                  {!notification.read && (
                    <div className="ml-1 h-2 w-2 rounded-full bg-[var(--fc-primary)] shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.3)]" />
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                 <p className="text-[11px] font-black uppercase tracking-wider text-[var(--fc-text-subtle)]">
                   {
                     formatNotificationTime(
                       notification.createdAt
                     )
                   }
                 </p>
                 {!notification.read && (
                   <span className="text-[10px] font-black uppercase tracking-widest text-[var(--fc-primary)]">New</span>
                 )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
