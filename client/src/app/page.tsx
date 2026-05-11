"use client";

import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import FlexDock from "@/components/navigation/FlexDock";

import LiveWallpaper from "@/components/chat/LiveWallpaper";

import WallpaperPicker from "@/components/chat/WallpaperPicker";

import CommandPalette from "@/components/chat/CommandPalette";

import SelectionToolbar from "@/components/chat/SelectionToolbar";

import VoiceMessageBubble from "@/components/chat/VoiceMessageBubble";

import MediaGallery from "@/components/chat/MediaGallery";

import StickerPanel from "@/components/chat/StickerPanel";

import PinnedMessage from "@/components/chat/PinnedMessage";

import OnlineUsers from "@/components/chat/OnlineUsers";

import ChatSidebar from "@/components/chat/ChatSidebar";

import MobileSidebar from "@/components/chat/MobileSidebar";

import StoriesBar from "@/components/chat/StoriesBar";

import AICopilot from "@/components/chat/AICopilot";

import ReactionBurst from "@/components/chat/ReactionBurst";

import GlobalSearch from "@/components/chat/GlobalSearch";

import MessageActions from "@/components/chat/MessageActions";

import ReactionPicker from "@/components/chat/ReactionPicker";

import VoiceRecorder from "@/components/chat/VoiceRecorder";

import TypingIndicator from "@/components/chat/TypingIndicator";

import ActiveCallCard from "@/components/chat/ActiveCallCard";

import MediaPreviewModal from "@/components/chat/MediaPreviewModal";

import NotificationCenter from "@/components/chat/NotificationCenter";

import ProfilePanel from "@/components/chat/ProfilePanel";

import SettingsPanel from "@/components/chat/SettingsPanel";

import ReplyPreview from "@/components/chat/ReplyPreview";

import MessageStatus from "@/components/chat/MessageStatus";

import ChatFolders from "@/components/chat/ChatFolders";

import VoiceCallScreen from "@/components/chat/VoiceCallScreen";

import VideoCallScreen from "@/components/chat/VideoCallScreen";

export default function ChatPage() {
  const [hovered, setHovered] =
    useState(false);

  const [reactionsOpen, setReactionsOpen] =
    useState(false);

  const [reactionBurst, setReactionBurst] =
    useState(false);

  const [commandOpen, setCommandOpen] =
    useState(false);

  const [wallpaperOpen, setWallpaperOpen] =
    useState(false);

  const [galleryOpen, setGalleryOpen] =
    useState(false);

  const [stickersOpen, setStickersOpen] =
    useState(false);

  const [pinnedOpen, setPinnedOpen] =
    useState(true);

  const [wallpaper, setWallpaper] =
    useState("purple");

  const [selectionMode, setSelectionMode] =
    useState(false);

  const [selectedCount, setSelectedCount] =
    useState(0);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [mediaOpen, setMediaOpen] =
    useState(false);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [aiOpen, setAiOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [replyOpen, setReplyOpen] =
    useState(true);

  const [voiceCallOpen, setVoiceCallOpen] =
    useState(false);

  const [videoCallOpen, setVideoCallOpen] =
    useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  useEffect(() => {
    if (reactionBurst) {
      const timer = setTimeout(() => {
        setReactionBurst(false);
      }, 1300);

      return () => clearTimeout(timer);
    }
  }, [reactionBurst]);

  return (
    <main
      className={`relative flex h-screen overflow-hidden text-white ${
        wallpaper === "midnight"
          ? "bg-gradient-to-br from-[#050816] via-slate-900 to-black"
          : "bg-gradient-to-br from-purple-600/20 via-fuchsia-500/20 to-cyan-500/20"
      }`}
    >
      <LiveWallpaper />

      <WallpaperPicker
        open={wallpaperOpen}
        onClose={() =>
          setWallpaperOpen(false)
        }
        onSelect={(value) =>
          setWallpaper(value)
        }
      />

      <CommandPalette
        open={commandOpen}
        onClose={() =>
          setCommandOpen(false)
        }
      />

      <SelectionToolbar
        open={selectionMode}
        count={selectedCount}
        onClose={() => {
          setSelectionMode(false);

          setSelectedCount(0);
        }}
      />

      <MediaGallery
        open={galleryOpen}
        onClose={() =>
          setGalleryOpen(false)
        }
      />

      <StickerPanel
        open={stickersOpen}
        onClose={() =>
          setStickersOpen(false)
        }
      />

      <AICopilot
        open={aiOpen}
        onClose={() =>
          setAiOpen(false)
        }
      />

      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() =>
          setMobileSidebarOpen(false)
        }
      />

      <GlobalSearch
        open={searchOpen}
        onClose={() =>
          setSearchOpen(false)
        }
      />

      <ChatSidebar />

      <VideoCallScreen
        open={videoCallOpen}
        onClose={() =>
          setVideoCallOpen(false)
        }
      />

      <VoiceCallScreen
        open={voiceCallOpen}
        onClose={() =>
          setVoiceCallOpen(false)
        }
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() =>
          setSettingsOpen(false)
        }
      />

      <ProfilePanel
        open={profileOpen}
        onClose={() =>
          setProfileOpen(false)
        }
      />

      <NotificationCenter
        open={notificationsOpen}
        onClose={() =>
          setNotificationsOpen(false)
        }
      />

      <MediaPreviewModal
        open={mediaOpen}
        onClose={() =>
          setMediaOpen(false)
        }
      />

      <ActiveCallCard />

      <div className="relative z-10 flex flex-1 flex-col">
        {/* TOPBAR */}
        <div className="border-b border-white/10 bg-black/20 px-6 py-4 backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            {/* LEFT */}
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setMobileSidebarOpen(true)
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] xl:hidden"
              >
                ☰
              </button>

              <div
                onClick={() =>
                  setProfileOpen(true)
                }
                className="flex cursor-pointer items-center gap-4"
              >
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-xl font-black shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                    M
                  </div>

                  <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    Mayuri
                  </h2>

                  <p className="text-sm text-green-300">
                    online now
                  </p>
                </div>
              </div>
            </div>

            {/* CLEAN ACTION BAR */}
            <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-3xl">
              {[
                "💬",
                "📞",
                "🔔",
                "👥",
                "📸",
                "✨",
                "⚙️",
              ].map((icon, index) => (
                <motion.button
                  key={index}
                  whileHover={{
                    scale: 1.08,
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-lg opacity-40 transition-all duration-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:opacity-100 hover:shadow-[0_10px_40px_rgba(34,211,238,0.2)]"
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>

          <PinnedMessage
            open={pinnedOpen}
            onClose={() =>
              setPinnedOpen(false)
            }
          />

          <div className="mt-6">
            <StoriesBar />
          </div>

          <div className="mt-5">
            <OnlineUsers />
          </div>

          <div className="mt-5">
            <ChatFolders />
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 space-y-10 overflow-y-auto px-4 py-8 pb-72 md:px-6">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[28px] rounded-bl-md border border-white/10 bg-black/30 px-5 py-4 backdrop-blur-3xl md:max-w-[75%]">
              FlexChat feels like a real product now 😭🔥

              <div className="mt-3 flex justify-end">
                <p className="text-xs text-white/40">
                  2:45 PM
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <VoiceMessageBubble />
          </div>

          <div className="flex justify-end">
            <div
              onMouseEnter={() =>
                setHovered(true)
              }
              onMouseLeave={() => {
                setHovered(false);

                setReactionsOpen(false);
              }}
              className="relative max-w-[85%] md:max-w-[75%]"
            >
              <ReactionBurst
                trigger={reactionBurst}
              />

              <AnimatePresence>
                {hovered && (
                  <MessageActions />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {reactionsOpen && (
                  <ReactionPicker />
                )}
              </AnimatePresence>

              <motion.div
                whileTap={{
                  scale: 0.96,
                }}
                onDoubleClick={() => {
                  setReactionsOpen(
                    !reactionsOpen
                  );

                  setReactionBurst(true);
                }}
                className="cursor-pointer rounded-[28px] rounded-br-md bg-gradient-to-r from-purple-600 to-cyan-500 px-5 py-4 shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
              >
                Telegram x Discord x Linear vibes 😈

                <div className="mt-3 flex items-center justify-end gap-2">
                  <p className="text-xs text-white/70">
                    2:46 PM
                  </p>

                  <MessageStatus status="read" />
                </div>
              </motion.div>
            </div>
          </div>

          <div className="flex justify-end">
            <VoiceMessageBubble mine />
          </div>

          <TypingIndicator />
        </div>

        {/* INPUT */}
        <div className="absolute bottom-24 left-0 right-0 border-t border-white/10 bg-black/20 p-4 backdrop-blur-3xl xl:bottom-0">
          <ReplyPreview
            open={replyOpen}
            onClose={() =>
              setReplyOpen(false)
            }
          />

          <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <button
              onClick={() =>
                setStickersOpen(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04]"
            >
              😊
            </button>

            <input
              placeholder="Type message..."
              className="flex-1 bg-transparent outline-none placeholder:text-white/35"
            />

            <VoiceRecorder />

            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              🚀
            </button>
          </div>
        </div>
      </div>

      <FlexDock />
    </main>
  );
}