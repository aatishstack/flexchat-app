"use client";

import {
  Bell,
  CheckCheck,
  X,
} from "lucide-react";

import { markNotificationsRead } from "@/services/notification.service";
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
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

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

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600/20 text-white">
            <Bell size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-white">
              Notifications
            </h2>

            <p className="text-sm text-zinc-500">
              Realtime activity
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
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-all hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Mark all notifications as read"
          >
            <CheckCheck size={18} />
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:bg-white/[0.06]"
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="chat-safe-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!notifications.length && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No notifications yet
          </div>
        )}

        {notifications.map(
          (
            notification
          ) => (
            <button
              type="button"
              key={
                notification.id
              }
              onClick={() =>
                markAsRead(
                  notification.id
                )
              }
              className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-left">
                  <h3 className="font-medium text-white">
                    {
                      notification.title
                    }
                  </h3>

                  <p className="mt-1 text-sm text-zinc-400">
                    {
                      notification.message
                    }
                  </p>
                </div>

                {!notification.read && (
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-purple-500" />
                )}
              </div>

              <p className="mt-3 text-xs text-zinc-600">
                {
                  formatNotificationTime(
                    notification.createdAt
                  )
                }
              </p>
            </button>
          )
        )}
      </div>
    </div>
  );
}
