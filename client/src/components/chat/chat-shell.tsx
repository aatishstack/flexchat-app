"use client";

import { useEffect } from "react";

import { ChevronLeft } from "lucide-react";

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

  function returnToConversationList() {
    useConversationStore.setState({
      activeConversationId: null,
    });
  }

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
        <div className="fc-panel flex min-h-16 shrink-0 items-center border-b px-4 pt-[env(safe-area-inset-top)] shadow-lg backdrop-blur-2xl sm:px-5 lg:hidden">
          <button
            type="button"
            onClick={returnToConversationList}
            className="fc-surface fc-hover flex h-11 w-11 items-center justify-center rounded-2xl border"
            aria-label="Back to conversations"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="ml-4">
            <h2 className="font-semibold">
              FlexChat
            </h2>
          </div>
        </div>

        {chat}
      </div>
    </main>
  );
}
