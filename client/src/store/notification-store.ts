"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationKind =
  | "block"
  | "call"
  | "missed_call"
  | "call_accepted"
  | "call_rejected";

export interface NotificationItem {
  id: string;

  title: string;

  message: string;

  createdAt: string;

  read?: boolean;

  kind?: NotificationKind;
}

interface NotificationState {
  notifications:
    NotificationItem[];

  addNotification: (
    notification: NotificationItem
  ) => void;

  markAsRead: (
    id: string
  ) => void;

  markAsUnread: (
    id: string
  ) => void;

  markAllRead: () => void;

  deleteNotification: (
    id: string
  ) => void;

  clearNotifications: () => void;
}

const MAX_NOTIFICATIONS = 80;
const CENTER_NOTIFICATION_KINDS: NotificationKind[] = [
  "block",
  "call",
  "missed_call",
  "call_accepted",
  "call_rejected",
];

function isCenterNotification(notification: NotificationItem) {
  return !!notification.kind && CENTER_NOTIFICATION_KINDS.includes(notification.kind);
}

export const useNotificationStore =
  create<NotificationState>()(
    persist(
    (set) => ({
      notifications: [],

      addNotification:
         (
          notification
        ) =>
          set(
            (
              state
            ) => {
              if (!isCenterNotification(notification)) {
                return state;
              }

              return {
                notifications:
                  [
                    notification,
                    ...state.notifications.filter(
                      (item) =>
                        item.id !==
                        notification.id
                    ),
                  ].slice(
                    0,
                    MAX_NOTIFICATIONS
                  ),
              };
            }
          ),

      markAsRead:
        (
          id
        ) =>
          set(
            (
              state
            ) => ({
              notifications:
                state.notifications.map(
                  (
                    item
                  ) =>
                    item.id ===
                    id
                      ? {
                          ...item,
                          read: true,
                        }
                      : item
                ),
            })
          ),

      markAsUnread:
        (
          id
        ) =>
          set(
            (
              state
            ) => ({
              notifications:
                state.notifications.map(
                  (
                    item
                  ) =>
                    item.id ===
                    id
                      ? {
                          ...item,
                          read: false,
                        }
                      : item
                ),
            })
          ),

      markAllRead:
        () =>
          set(
            (
              state
            ) => ({
              notifications:
                state.notifications.map(
                  (
                    item
                  ) => ({
                    ...item,
                    read: true,
                  })
                ),
            })
          ),

      deleteNotification:
        (
          id
        ) =>
          set(
            (
              state
            ) => ({
              notifications:
                state.notifications.filter(
                  (
                    item
                  ) =>
                    item.id !==
                    id
                ),
            })
          ),

      clearNotifications:
        () =>
          set({
            notifications:
              [],
          }),
    }),
    {
      name: "flexchat-notifications",
      partialize: (state) => ({
        notifications: state.notifications.filter(isCenterNotification),
      }),
    },
    )
  );
