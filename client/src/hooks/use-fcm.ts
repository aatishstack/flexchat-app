import { useEffect, useCallback } from "react";
import { getFcmToken, onMessageListener } from "@/lib/firebase";
import { registerFcmToken } from "@/services/notification.service";
import { useAuthStore } from "@/stores/auth.store";

export const useFcm = () => {
  const { user } = useAuthStore();

  const initializeFcm = useCallback(async () => {
    if (!user) return;

    try {
      // Check current permission status
      let permission = Notification.permission;
      
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "granted") {
        const token = await getFcmToken();
        if (token) {
          await registerFcmToken(token);
          console.info("[FCM] Token registered successfully");
        }
      } else if (permission === "denied") {
        console.warn("[FCM] Notification permission denied");
      }
    } catch (error) {
      console.error("[FCM] Initialization failed", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      initializeFcm();
    }
  }, [user, initializeFcm]);

  useEffect(() => {
    onMessageListener()
      .then((payload) => {
        console.info("[FCM] Message received in foreground: ", payload);
        // We can extend this to show a toast or update state
      })
      .catch((err) => console.error("[FCM] Foreground listener error: ", err));
  }, []);

  return { initializeFcm };
};
