"use client";

import { useRouter } from "next/navigation";

import NewChatPanel from "@/components/chat/conversation/new-chat-panel";

export default function ContactsPage() {
  const router = useRouter();

  return (
    <main className="h-[calc(100dvh-var(--fc-mobile-nav-height,4.75rem))] min-h-[calc(100svh-var(--fc-mobile-nav-height,4.75rem))] bg-[var(--fc-app-bg)] text-[var(--fc-theme-text)] lg:h-dvh lg:min-h-svh">
      <NewChatPanel
        variant="page"
        onClose={() => router.replace("/chat")}
      />
    </main>
  );
}
