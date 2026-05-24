"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { tokenStorage } from "@/lib/token";
import { socket } from "@/socket/socket";
import { useSocketStore } from "@/store/socket-store";

export function useAppLifecycle() {
  const queryClient = useQueryClient();
  const connectSocket = useSocketStore(
    (state) => state.connectSocket,
  );

  useEffect(() => {
    let hiddenAt: number | null = null;

    function reconnectIfNeeded() {
      const token = tokenStorage.get();

      if (token && !socket.connected) {
        connectSocket(token);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }

      const wasHiddenMs =
        hiddenAt === null
          ? 0
          : Date.now() - hiddenAt;

      hiddenAt = null;
      reconnectIfNeeded();

      if (wasHiddenMs > 30_000) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.all,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.stories.all,
        });
      }
    }

    function onOnline() {
      reconnectIfNeeded();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    }

    function onFocus() {
      reconnectIfNeeded();
    }

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
    );
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    connectSocket,
    queryClient,
  ]);
}
