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
