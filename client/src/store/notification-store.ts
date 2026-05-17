"use client";

import { create } from "zustand";

export interface NotificationItem {
  id: string;

  title: string;

  message: string;

  createdAt: string;

  read?: boolean;
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

  clearNotifications: () => void;
}

const MAX_NOTIFICATIONS = 80;

export const useNotificationStore =
  create<NotificationState>(
    (set) => ({
      notifications: [],

      addNotification:
        (
          notification
        ) =>
          set(
            (
              state
            ) => ({
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
            })
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

      clearNotifications:
        () =>
          set({
            notifications:
              [],
          }),
    })
  );
