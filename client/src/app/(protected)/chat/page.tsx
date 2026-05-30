"use client";

import { motion } from "framer-motion";

import { type CSSProperties, useEffect } from "react";

import ChatShell from "../../../components/chat/chat-shell";
import ChatSidebar from "../../../components/chat/sidebar/chat-sidebar";
import ChatConversation from "../../../components/chat/conversation/chat-conversation";
import GlobalSearch from "../../../components/chat/sidebar/global-search";
import { useGlobalSearchStore } from "../../../store/global-search-store";
import ActivityBar from "../../../components/chat/sidebar/activity-bar";
import { useConversationStore } from "../../../stores/conversation.store";

export default function ChatPage() {
  const setGlobalSearchOpen = useGlobalSearchStore((state) => state.setOpen);
  const activeConversationId = useConversationStore(
    (state) => state.activeConversationId,
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "j") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setGlobalSearchOpen]);

  useEffect(() => {
    const pendingConversationId = window.sessionStorage.getItem(
      "flexchat:pending-conversation",
    );

    if (!pendingConversationId) {
      return;
    }

    window.sessionStorage.removeItem("flexchat:pending-conversation");
    useConversationStore.setState({
      activeConversationId: pendingConversationId,
    });
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    if (!window.history.state?.flexchatChatOpen) {
      window.history.pushState(
        {
          ...window.history.state,
          flexchatChatOpen: true,
        },
        "",
        window.location.href,
      );
    }

    function handlePopState() {
      if (!useConversationStore.getState().activeConversationId) {
        return;
      }

      useConversationStore.setState({
        activeConversationId: null,
      });
      window.dispatchEvent(
        new CustomEvent("flexchat:open-mobile-sidebar"),
      );
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeConversationId]);

  return (
    <div
      style={
        {
          "--fc-mobile-nav-height":
            "calc(4.75rem + env(safe-area-inset-bottom))",
          "--chat-floating-safe-bottom":
            "calc(5.75rem + env(safe-area-inset-bottom))",
        } as CSSProperties
      }
      className="relative h-[calc(100dvh-var(--fc-mobile-nav-height))] min-h-[calc(100svh-var(--fc-mobile-nav-height))] overflow-hidden bg-[var(--fc-app-bg)] text-[var(--fc-theme-text)] lg:h-dvh lg:min-h-svh"
    >
      <GlobalSearch />
      <ActivityBar />

      <div className="flex h-full w-full overflow-hidden">
        <motion.div
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 28,
          }}
          className="flex min-w-0 flex-1 overflow-hidden"
        >
          <ChatShell
            sidebar={<ChatSidebar />}
            chat={<ChatConversation />}
          />
        </motion.div>
      </div>
    </div>
  );
}
