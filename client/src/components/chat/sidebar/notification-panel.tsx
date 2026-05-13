"use client";

import {
  Bell,
  Trash2,
} from "lucide-react";

import { useNotificationStore } from "@/store/notification-store";

export default function NotificationPanel() {
  const notifications =
    useNotificationStore(
      (state) =>
        state.notifications
    );

  const clearNotifications =
    useNotificationStore(
      (state) =>
        state.clearNotifications
    );

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

        <button
          onClick={
            clearNotifications
          }
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-all hover:bg-white/[0.06]"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!notifications.length && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No notifications yet
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
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
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
                  notification.createdAt
                }
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}