import { api } from "./api";
import { tokenStorage } from "@/lib/token";
import { useAuthStore } from "@/stores/auth.store";

import type { NotificationItem } from "@/store/notification-store";

let isClearingNotifications = false;

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
  if (isClearingNotifications) {
    console.info("[NOTIFICATIONS] cleanup_requested ignored: already clearing", {
      timestamp: Date.now(),
    });
    return;
  }

  const tokenPresent = tokenStorage.exists();
  const authenticated = useAuthStore.getState().isAuthenticated;

  console.info("[NOTIFICATIONS] cleanup_requested", {
    authenticated,
    token_present: tokenPresent,
    timestamp: Date.now(),
  });

  if (!tokenPresent && !authenticated) {
    console.info("[NOTIFICATIONS] request_skipped", {
      reason: "no_valid_auth_state",
      timestamp: Date.now(),
    });
    return;
  }

  isClearingNotifications = true;
  console.info("[NOTIFICATIONS] request_sent", {
    timestamp: Date.now(),
  });

  try {
    await api.delete("/notifications");
  } finally {
    isClearingNotifications = false;
  }
}

export async function registerFcmToken(token: string) {
  await api.post("/notifications/fcm-token", {
    token,
    deviceType: "web",
  });
}

export async function deleteFcmToken(token: string) {
  await api.delete(`/notifications/fcm-token/${token}`);
}
