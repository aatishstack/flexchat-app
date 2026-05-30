"use client";

import { AnimatePresence, motion } from "framer-motion";

import { type CSSProperties, useEffect, useState } from "react";

import dynamic from "next/dynamic";

import ChatShell from "../../../components/chat/chat-shell";
import ChatSidebar from "../../../components/chat/sidebar/chat-sidebar";
import ChatConversation from "../../../components/chat/conversation/chat-conversation";
import GlobalSearch from "../../../components/chat/sidebar/global-search";
import { useGlobalSearchStore } from "../../../store/global-search-store";
import ActivityBar from "../../../components/chat/sidebar/activity-bar";
import { useConversationStore } from "../../../stores/conversation.store";

const ActiveNowPanel = dynamic(
  () => import("../../../components/chat/sidebar/active-now-panel"),
  {
    ssr: false,
  },
);

const DiscoverPanel = dynamic(
  () => import("../../../components/chat/conversation/discover-panel"),
  {
    ssr: false,
  },
);

const MobileNotificationSheet = dynamic(
  () => import("../../../components/chat/mobile/mobile-notification-sheet"),
  {
    ssr: false,
  },
);

const NotificationPanel = dynamic(
  () => import("../../../components/chat/sidebar/notification-panel"),
  {
    ssr: false,
  },
);

const CallLayer = dynamic(
  () => import("../../../components/chat/calls/call-layer"),
  {
    ssr: false,
  },
);

export default function ChatPage() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [activeNowOpen, setActiveNowOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"discover" | "active" | null>(
    null,
  );

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
          "--chat-right-rail-width": "20rem",
          "--chat-notification-panel-width": "21.25rem",
          "--chat-panel-gap": "1rem",
          "--fc-mobile-nav-height":
            "calc(4.75rem + env(safe-area-inset-bottom))",
          "--chat-floating-safe-bottom":
            "calc(5.75rem + env(safe-area-inset-bottom))",
        } as CSSProperties
      }
      className="relative h-[calc(100dvh-var(--fc-mobile-nav-height))] min-h-[calc(100svh-var(--fc-mobile-nav-height))] overflow-hidden bg-[var(--fc-app-bg)] text-[var(--fc-theme-text)] lg:h-dvh lg:min-h-svh"
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
                {discoverOpen ? <DiscoverPanel /> : null}

                <div className="min-w-0 flex-1">
                  <ChatConversation
                    discoverOpen={discoverOpen}
                    activeNowOpen={activeNowOpen}
                    onToggleDiscover={() => {
                      if (window.matchMedia("(min-width: 1280px)").matches) {
                        setDiscoverOpen((open) => !open);
                        return;
                      }

                      setMobilePanel("discover");
                    }}
                    onToggleActiveNow={() => {
                      if (window.matchMedia("(min-width: 1280px)").matches) {
                        setActiveNowOpen((open) => !open);
                        return;
                      }

                      setMobilePanel("active");
                    }}
                    onOpenNotifications={() => setNotificationsOpen(true)}
                  />
                </div>

                {activeNowOpen ? <ActiveNowPanel /> : null}
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
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(var(--chat-right-rail-width)+var(--chat-panel-gap))] top-[calc(5rem+env(safe-area-inset-top))] z-[180] hidden w-[var(--chat-notification-panel-width)] overflow-hidden rounded-[32px] border border-[var(--fc-app-border)] bg-[var(--fc-app-surface)] shadow-2xl shadow-black/45 backdrop-blur-2xl xl:flex"
          >
            <NotificationPanel onClose={() => setNotificationsOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FLOATING ROOT REMOVED
          duplicate floating notification bell removed
          top header notification action preserved */}

      {/* MOBILE NOTIFICATION SHEET */}
      <MobileNotificationSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <AnimatePresence>
        {mobilePanel ? (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[220] bg-black/65 backdrop-blur-xl xl:hidden"
          >
            <motion.div
              initial={{
                y: "100%",
              }}
              animate={{
                y: 0,
              }}
              exit={{
                y: "100%",
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 30,
              }}
              className="absolute inset-x-0 bottom-0 h-[min(82dvh,720px)] overflow-hidden rounded-t-[32px] border border-[var(--fc-app-border)] bg-[var(--fc-app-panel)] shadow-[0_-24px_90px_rgba(0,0,0,0.55)]"
            >
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-transparent backdrop-blur-xl before:text-lg before:font-semibold before:leading-none before:text-white before:content-['X']"
                aria-label="Close panel"
              >
                ×
              </button>

              {mobilePanel === "discover" ? (
                <DiscoverPanel
                  variant="sheet"
                  onConversationOpen={() => setMobilePanel(null)}
                />
              ) : (
                <ActiveNowPanel
                  variant="sheet"
                  onConversationOpen={() => setMobilePanel(null)}
                />
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CallLayer />
    </div>
  );
}
