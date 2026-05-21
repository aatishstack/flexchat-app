"use client";

import { queryClient } from "@/lib/query-client";
import { tokenStorage } from "@/lib/token";
import { useBookmarkStore } from "@/store/bookmark-store";
import { useCallStore } from "@/store/call-store";
import { useGlobalSearchStore } from "@/store/global-search-store";
import { useMediaStore } from "@/store/media-store";
import { useMessageSelectionStore } from "@/store/message-selection-store";
import { useNotificationStore } from "@/store/notification-store";
import { usePinStore } from "@/store/pin-store";
import { usePresenceStore } from "@/store/presence-store";
import { useReactionStore } from "@/store/reaction-store";
import { useReplyStore } from "@/store/reply.store";
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
  useMessageSelectionStore
    .getState()
    .clear();
  useSocketStore
    .getState()
    .disconnectSocket();
  useAuthStore.getState().logout();

  useReplyStore.setState({
    replyingTo: null,
  });
  useReactionStore.setState({
    reactions: {},
  });
  usePinStore.setState({
    pinned: [],
  });
  useBookmarkStore.setState({
    bookmarks: [],
  });
  useGlobalSearchStore.setState({
    open: false,
    query: "",
  });
  useMediaStore.setState({
    previewImage: null,
  });
  usePresenceStore.setState({
    onlineUsers: [],
    typingUsers: [],
  });
}
