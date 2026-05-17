"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  type CSSProperties,
  useEffect,
  useState,
} from "react";

import dynamic from "next/dynamic";

import ChatShell from "../../../components/chat/chat-shell";
import ChatSidebar from "../../../components/chat/sidebar/chat-sidebar";
import ChatConversation from "../../../components/chat/conversation/chat-conversation";
import GlobalSearch from "../../../components/chat/sidebar/global-search";
import { useGlobalSearchStore } from "../../../store/global-search-store";
import LiveToast from "../../../components/chat/sidebar/live-toast";
import ActivityBar from "../../../components/chat/sidebar/activity-bar";

const ActiveNowPanel = dynamic(
  () =>
    import(
      "../../../components/chat/sidebar/active-now-panel"
    ),
  {
    ssr: false,
  }
);

const DiscoverPanel = dynamic(
  () =>
    import(
      "../../../components/chat/conversation/discover-panel"
    ),
  {
    ssr: false,
  }
);

const FloatingRoot = dynamic(
  () =>
    import(
      "../../../components/chat/floating/floating-root"
    ),
  {
    ssr: false,
  }
);

const MobileNotificationSheet = dynamic(
  () =>
    import(
      "../../../components/chat/mobile/mobile-notification-sheet"
    ),
  {
    ssr: false,
  }
);

const NotificationPanel = dynamic(
  () =>
    import(
      "../../../components/chat/sidebar/notification-panel"
    ),
  {
    ssr: false,
  }
);

export default function ChatPage() {
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
    <div
      style={
        {
          "--chat-right-rail-width":
            "20rem",
          "--chat-notification-panel-width":
            "21.25rem",
          "--chat-panel-gap":
            "1rem",
        } as CSSProperties
      }
      className="relative h-dvh overflow-hidden bg-gradient-to-br from-[#050816] via-[#0B1020] to-[#111827] text-white"
    >
      {/* SEARCH */}
      <GlobalSearch />

      {/* LIVE TOAST */}
      <LiveToast />

      {/* ACTIVITY */}
      <ActivityBar />

      {/* GLOW EFFECTS */}
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[300px] w-[300px] rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="pointer-events-none absolute bottom-[-120px] right-[-120px] h-[300px] w-[300px] rounded-full bg-fuchsia-600/20 blur-[120px]" />

      {/* MAIN */}
      <div className="flex h-full w-full overflow-hidden">
        {/* CHAT AREA */}
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
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(var(--chat-right-rail-width)+var(--chat-panel-gap))] top-[calc(5rem+env(safe-area-inset-top))] z-[180] hidden w-[var(--chat-notification-panel-width)] overflow-hidden rounded-[32px] border border-white/10 bg-[#0B111C]/95 shadow-2xl backdrop-blur-2xl xl:flex"
          >
            <NotificationPanel
              onClose={() =>
                setNotificationsOpen(
                  false
                )
              }
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FLOATING ROOT */}
      <FloatingRoot
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={
          setNotificationsOpen
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
