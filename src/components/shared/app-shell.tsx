"use client";

import Sidebar from "@/components/sidebar/sidebar";

import ChatLayout from "@/components/chat/chat-layout";

import AppBackground from "./app-background";

import MobileWarning from "./mobile-warning";

import { useSocket } from "@/hooks/use-socket";

export default function AppShell() {
  useSocket();

  return (
    <main className="relative h-screen overflow-hidden bg-[#020206] text-white">

      {/* MOBILE */}
      <MobileWarning />

      {/* BACKGROUND */}
      <AppBackground />

      <div className="relative z-10 flex h-full">

        {/* SIDEBAR */}
        <Sidebar />

        {/* CHAT */}
        <ChatLayout />
      </div>
    </main>
  );
}