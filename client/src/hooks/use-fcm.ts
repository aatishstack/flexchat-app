import { useEffect, useCallback } from "react";
import {
  getFcmToken,
  subscribeToForegroundMessages,
} from "@/lib/firebase";
import { registerFcmToken } from "@/services/notification.service";
import { useAuthStore } from "@/stores/auth.store";

export const useFcm = () => {
  const user = useAuthStore((state) => state.user);

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
      // Small jitter to prevent simultaneous heavy operations on mount/focus
      const timer = setTimeout(() => {
        initializeFcm();
      }, 1500 + Math.random() * 1000);
      return () => clearTimeout(timer);
    }
  }, [user, initializeFcm]);

  useEffect(() => {
    try {
      const unsubscribe = subscribeToForegroundMessages((payload) => {
        console.info("[FCM] Message received in foreground: ", payload);
      });

      return unsubscribe;
    } catch (error) {
      console.error("[FCM] Foreground listener error: ", error);
    }
  }, []);

  return { initializeFcm };
};
