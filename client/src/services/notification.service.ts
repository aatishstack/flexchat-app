import { api } from "./api";

import type { NotificationItem } from "@/store/notification-store";

export async function fetchNotifications() {
  const response =
    await api.get<{
      notifications: NotificationItem[];
    }>("/notifications");

  return response.data.notifications;
}

export async function markNotificationsRead() {
  await api.patch("/notifications/read");
}

export async function markNotificationRead(
  notificationId: string,
  read: boolean
) {
  await api.patch(
    `/notifications/${notificationId}/read`,
    {
      read,
    }
  );
}

export async function deleteNotificationRequest(
  notificationId: string
) {
  await api.delete(
    `/notifications/${notificationId}`
  );
}

export async function clearNotificationsRequest() {
  await api.delete("/notifications");
}
