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
    <div className="flex h-full w-full flex-col bg-[#0C0C10]">
      <div className="flex items-center justify-between border-b border-white/[0.05] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C4FF0]/10 text-[#7C4FF0]">
            <Bell size={22} />
          </div>

          <div>
            <h2 className="text-[18px] font-extrabold text-white tracking-tight">
              Notifications
            </h2>

            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/28">
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
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/20 transition-all hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
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
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/20 transition-all hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Clear notifications"
          >
            <Trash2 size={18} />
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/30 transition-all hover:bg-white/[0.06]"
              aria-label="Close notifications"
            >
              <X size={19} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="chat-safe-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {!notifications.length && (
          <div className="flex h-full flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.02] flex items-center justify-center mb-5">
               <Bell size={32} className="text-white/10" />
            </div>
            <p className="text-[14px] font-bold text-white/20 tracking-tight">Nothing to see here</p>
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
              className="w-full rounded-[24px] border border-white/[0.03] bg-[#16161D] p-5 text-left transition hover:bg-[#1E1E27]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-left min-w-0 flex-1">
                  <h3 className="text-[15.5px] font-bold text-white tracking-tight">
                    {
                      notification.title
                    }
                  </h3>

                  <p className="mt-1 text-[13px] font-medium leading-relaxed text-white/40">
                    {
                      notification.message
                    }
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleToggleRead(
                        notification.id,
                        !notification.read
                      );
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/20 transition hover:text-white"
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
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/20 transition hover:text-red-400"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={15} />
                  </button>

                  {!notification.read && (
                    <div className="ml-1 h-2 w-2 rounded-full bg-[#7C4FF0] shadow-lg shadow-[#7C4FF0]/30" />
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                 <p className="text-[11px] font-bold uppercase tracking-widest text-white/20">
                   {
                     formatNotificationTime(
                       notification.createdAt
                     )
                   }
                 </p>
                 {!notification.read && (
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7C4FF0]">New</span>
                 )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
