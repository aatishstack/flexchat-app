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

const CallLayer = dynamic(
  () =>
    import(
      "../../../components/chat/calls/call-layer"
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
          "--chat-floating-safe-bottom":
            "calc(5.75rem + env(safe-area-inset-bottom))",
        } as CSSProperties
      }
      className="relative h-dvh min-h-svh overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(168,85,247,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,0.08),transparent_24%),linear-gradient(135deg,#050816_0%,#090d19_48%,#0b1020_100%)] text-white"
    >
      {/* SEARCH */}
      <GlobalSearch />

      {/* ACTIVITY */}
      <ActivityBar />

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
                  <ChatConversation
                    onOpenNotifications={() =>
                      setNotificationsOpen(true)
                    }
                  />
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
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(var(--chat-right-rail-width)+var(--chat-panel-gap))] top-[calc(5rem+env(safe-area-inset-top))] z-[180] hidden w-[var(--chat-notification-panel-width)] overflow-hidden rounded-[32px] border border-white/10 bg-[#0B111C]/95 shadow-2xl shadow-black/45 backdrop-blur-2xl xl:flex"
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

      <CallLayer />
    </div>
  );
}
