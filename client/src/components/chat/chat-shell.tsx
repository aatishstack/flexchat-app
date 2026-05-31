"use client";

import { useEffect } from "react";

import { useConversationStore } from "@/stores/conversation.store";

interface Props {
  sidebar: React.ReactNode;
  chat: React.ReactNode;
}

export default function ChatShell({
  sidebar,
  chat,
}: Props) {
  const activeConversationId =
    useConversationStore(
      (state) => state.activeConversationId,
    );

  useEffect(() => {
    function handleOpenMobileSidebar() {
      useConversationStore.setState({
        activeConversationId: null,
      });
    }

    window.addEventListener(
      "flexchat:open-mobile-sidebar",
      handleOpenMobileSidebar,
    );

    return () => {
      window.removeEventListener(
        "flexchat:open-mobile-sidebar",
        handleOpenMobileSidebar,
      );
    };
  }, []);

  return (
    <main className="flex h-full min-h-0 w-full overflow-hidden bg-transparent text-[var(--fc-theme-text)]">
      <div
        className={`h-full w-full shrink-0 lg:flex lg:w-auto ${
          activeConversationId
            ? "hidden"
            : "flex"
        }`}
      >
        {sidebar}
      </div>

      <div
        className={`relative min-w-0 flex-1 flex-col ${
          activeConversationId
            ? "flex"
            : "hidden lg:flex"
        }`}
      >
        {chat}
      </div>
    </main>
  );
}
