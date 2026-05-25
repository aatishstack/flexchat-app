"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { tokenStorage } from "@/lib/token";
import {
  refreshSocketAuth,
  socket,
} from "@/socket/socket";
import { useSocketStore } from "@/store/socket-store";

export function useAppLifecycle() {
  const queryClient = useQueryClient();
  const connectSocket = useSocketStore(
    (state) => state.connectSocket,
  );

  useEffect(() => {
    let hiddenAt: number | null = null;

    function reconnectIfNeeded(reason: string) {
      const token = tokenStorage.get();

      if (!token) {
        return;
      }

      refreshSocketAuth(reason);

      if (!socket.connected && !socket.active) {
        console.info("[SOCKET] lifecycle reconnect requested", {
          reason,
          hasToken: true,
        });
        connectSocket(token);
        return;
      }

      if (socket.connected) {
        useSocketStore.getState().rejoinActiveConversation();
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
      reconnectIfNeeded("visibility");

      if (wasHiddenMs > 30_000) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.all,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.stories.all,
        });
        const activeConversationId =
          useSocketStore.getState().activeConversationId;

        if (activeConversationId) {
          void queryClient.invalidateQueries({
            queryKey:
              queryKeys.messages.list(activeConversationId),
          });
        }
      }
    }

    function onOnline() {
      reconnectIfNeeded("online");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stories.all,
      });
    }

    function onFocus() {
      reconnectIfNeeded("focus");
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
