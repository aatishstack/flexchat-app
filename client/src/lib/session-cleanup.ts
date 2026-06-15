"use client";

import { queryClient } from "@/lib/query-client";
import { tokenStorage } from "@/lib/token";
import { useBookmarkStore } from "@/store/bookmark-store";
import { useCallStore } from "@/store/call-store";
import { useGlobalSearchStore } from "@/store/global-search-store";
import { useNotificationStore } from "@/store/notification-store";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";

type ClearSessionOptions = {
  removeToken?: boolean;
};

export function clearClientSession({
  removeToken = true,
}: ClearSessionOptions = {}) {
  if (removeToken) {
    tokenStorage.remove();
  }

  queryClient.clear();
  useCallStore.getState().resetCall();
  useConversationStore
    .getState()
    .resetConversationState();
  useNotificationStore
    .getState()
    .clearNotifications();
  useSocketStore
    .getState()
    .disconnectSocket();
  useAuthStore.getState().logout();

  useBookmarkStore.setState({
    bookmarks: [],
  });
  useGlobalSearchStore.setState({
    open: false,
    query: "",
  });
}
