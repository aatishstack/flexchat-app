"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  useEffect,
  useState,
} from "react";

import ChatShell from "../../../components/chat/chat-shell";
import ChatSidebar from "../../../components/chat/sidebar/chat-sidebar";
import ChatConversation from "../../../components/chat/conversation/chat-conversation";
import NotificationPanel from "../../../components/chat/sidebar/notification-panel";
import GlobalSearch from "../../../components/chat/sidebar/global-search";
import DiscoverPanel from "../../../components/chat/conversation/discover-panel";
import { useGlobalSearchStore } from "../../../store/global-search-store";
import LiveToast from "../../../components/chat/sidebar/live-toast";
import ActiveNowPanel from "../../../components/chat/sidebar/active-now-panel";
import ActivityBar from "../../../components/chat/sidebar/activity-bar";

import FloatingRoot from "../../../components/chat/floating/floating-root";

import IncomingCallPopup from "../../../components/chat/floating/incoming-call-popup";

import MiniCallIsland from "../../../components/chat/floating/mini-call-island";

import MobileAISheet from "../../../components/chat/mobile/mobile-ai-sheet";

import MobileNotificationSheet from "../../../components/chat/mobile/mobile-notification-sheet";

export default function ChatPage() {
  const [aiOpen, setAiOpen] =
    useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const setGlobalSearchOpen =
    useGlobalSearchStore(
      (state) =>
        state.setOpen
    );

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        (
          event.ctrlKey ||
          event.metaKey
        ) &&
        event.key === "j"
      ) {
        event.preventDefault();

        setGlobalSearchOpen(
          true
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    setGlobalSearchOpen,
  ]);

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-[#050816] via-[#0B1020] to-[#111827] text-white">
      {/* SEARCH */}
      <GlobalSearch />

      {/* LIVE TOAST */}
      <LiveToast />

      {/* INCOMING CALL */}
      <IncomingCallPopup />

      {/* ACTIVE CALL ISLAND */}
      <MiniCallIsland />

      {/* ACTIVITY */}
      <ActivityBar />

      {/* GLOW EFFECTS */}
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-[300px] w-[300px] rounded-full bg-fuchsia-600/20 blur-[120px]" />

      {/* MAIN */}
      <div className="flex h-full w-full overflow-hidden">
        {/* CHAT AREA */}
        <motion.div
          layout
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 28,
          }}
          className="flex min-w-0 flex-1 overflow-hidden"
        >
          <ChatShell
            sidebar={<ChatSidebar />}
            chat={
              <div className="flex h-full w-full overflow-hidden">
                <DiscoverPanel />

                <div className="min-w-0 flex-1">
                  <ChatConversation />
                </div>

                <ActiveNowPanel />
              </div>
            }
          />
        </motion.div>

        {/* DESKTOP AI PANEL */}
        <AnimatePresence mode="wait">
          {aiOpen && (
            <motion.aside
              initial={{
                width: 0,
                opacity: 0,
              }}
              animate={{
                width: 380,
                opacity: 1,
              }}
              exit={{
                width: 0,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 30,
              }}
              className="hidden xl:flex h-full overflow-hidden border-l border-white/10 bg-[#0B111C]/90 backdrop-blur-2xl"
            >
              <div className="flex h-full w-full flex-col">
                {/* HEADER */}
                <div className="border-b border-white/10 bg-white/[0.02] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{
                          rotate: [
                            0,
                            10,
                            -10,
                            0,
                          ],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                        }}
                        className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-500 text-2xl shadow-2xl shadow-purple-500/30"
                      >
                        ✨
                      </motion.div>

                      <div>
                        <h2 className="text-lg font-semibold">
                          Flex AI
                        </h2>

                        <p className="text-sm text-zinc-400">
                          Smart assistant
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setAiOpen(
                          false
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white transition hover:bg-white/[0.08]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="rounded-[28px] border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 p-5 backdrop-blur-xl">
                    <p className="text-sm leading-relaxed text-zinc-300">
                      Ask Flex AI to summarize chats,
                      search files, generate replies,
                      or manage conversations.
                    </p>
                  </div>
                </div>

                {/* INPUT */}
                <div className="border-t border-white/10 p-4">
                  <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4 backdrop-blur-xl">
                    <input
                      placeholder="Ask Flex AI..."
                      className="h-14 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
                    />

                    <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/30">
                      ✨
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* NOTIFICATION PANEL */}
      <AnimatePresence>
        {notificationsOpen && (
          <motion.aside
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.96,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 28,
            }}
            className="fixed right-4 top-20 z-50 hidden h-[620px] w-[340px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0B111C]/95 shadow-2xl backdrop-blur-2xl xl:flex"
          >
            <NotificationPanel />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FLOATING ROOT */}
      <FloatingRoot
        aiOpen={aiOpen}
        setAiOpen={setAiOpen}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={
          setNotificationsOpen
        }
      />

      {/* MOBILE AI SHEET */}
      <MobileAISheet
        open={aiOpen}
        onClose={() =>
          setAiOpen(false)
        }
      />

      {/* MOBILE NOTIFICATION SHEET */}
      <MobileNotificationSheet
        open={notificationsOpen}
        onClose={() =>
          setNotificationsOpen(false)
        }
      />
    </div>
  );
}