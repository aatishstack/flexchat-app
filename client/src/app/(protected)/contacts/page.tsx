"use client";

import { useRouter } from "next/navigation";

import DiscoverPanel from "@/components/chat/conversation/discover-panel";

export default function ContactsPage() {
  const router = useRouter();

  return (
    <main className="h-[calc(100dvh-var(--fc-mobile-nav-height,4.75rem))] min-h-[calc(100svh-var(--fc-mobile-nav-height,4.75rem))] bg-[var(--fc-app-bg)] text-[var(--fc-theme-text)] lg:h-dvh lg:min-h-svh">
      <DiscoverPanel
        variant="sheet"
        onConversationOpen={() => router.replace("/chat")}
      />
    </main>
  );
}
