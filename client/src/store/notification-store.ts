"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { 
  markNotificationRead as markNotificationReadApi, 
  deleteNotificationRequest, 
  markNotificationsRead,
  clearNotificationsRequest
} from "@/services/notification.service";

export type NotificationKind =
  | "block"
  | "call"
  | "missed_call"
  | "call_accepted"
  | "call_rejected"
  | "message_reaction"
  | "story_reaction"
  | "story_reply"
  | "friend_request";

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

  setNotifications: (
    notifications: NotificationItem[]
  ) => void;

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

export const useNotificationStore =
  create<NotificationState>()(
    persist(
    (set) => ({
      notifications: [],

      setNotifications: (notifications) =>
        set({ notifications: notifications.slice(0, MAX_NOTIFICATIONS) }),

      addNotification:
         (
          notification
        ) =>
          set(
            (
              state
            ) => {
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

      markAsRead: (id) => {
        set((state) => ({
          notifications:
            state.notifications.map(
              (item) =>
                item.id === id
                  ? {
                      ...item,
                      read: true,
                    }
                  : item
            ),
        }));
        void markNotificationReadApi(id, true).catch(() => {});
      },

      markAsUnread: (id) => {
        set((state) => ({
          notifications:
            state.notifications.map(
              (item) =>
                item.id === id
                  ? {
                      ...item,
                      read: false,
                    }
                  : item
            ),
        }));
        void markNotificationReadApi(id, false).catch(() => {});
      },

      markAllRead: () => {
        set((state) => ({
          notifications:
            state.notifications.map(
              (item) => ({
                ...item,
                read: true,
              })
            ),
        }));
        void markNotificationsRead().catch(() => {});
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications:
            state.notifications.filter(
              (item) =>
                item.id !== id
            ),
        }));
        void deleteNotificationRequest(id).catch(() => {});
      },

      clearNotifications: () => {
        set({
          notifications: [],
        });
        void clearNotificationsRequest().catch(() => {});
      },
    }),
    {
      name: "flexchat-notifications",
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    },
    )
  );

