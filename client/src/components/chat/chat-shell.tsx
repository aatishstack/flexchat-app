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
    <main className="flex h-full min-h-0 w-full overflow-hidden bg-transparent text-white">
      <div
        className={`h-full w-full lg:hidden ${
          activeConversationId
            ? "hidden"
            : "flex"
        }`}
      >
        {sidebar}
      </div>

      <div className="hidden lg:flex">
        {sidebar}
      </div>

      <div
        className={`relative min-w-0 flex-1 flex-col ${
          activeConversationId
            ? "flex"
            : "hidden lg:flex"
        }`}
      >
        <div className="flex min-h-16 shrink-0 items-center border-b border-[var(--fc-app-border)] bg-[var(--fc-app-panel)] px-4 pt-[env(safe-area-inset-top)] shadow-lg shadow-black/20 backdrop-blur-2xl sm:px-5 lg:hidden">
          <button
            type="button"
            onClick={returnToConversationList}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
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
