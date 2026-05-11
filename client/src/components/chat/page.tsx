"use client";

import { useState } from "react";

import Link from "next/link";

import {
  Search,
  Phone,
  Video,
  MoreVertical,
  SendHorizonal,
  Smile,
  Paperclip,
  Mic,
  Menu,
  X,
  MessageCircle,
  Users,
  Compass,
  Settings,
  Camera,
  ImageIcon,
  FileText,
  Headphones,
  MapPin,
  Trash2,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  {
    icon: MessageCircle,
    label: "Chats",
    active: true,
  },
  {
    icon: Users,
    label: "Friends",
  },
  {
    icon: Compass,
    label: "Discover",
  },
  {
    icon: Phone,
    label: "Calls",
  },
  {
    icon: Settings,
    label: "Settings",
  },
];

const attachmentItems = [
  {
    icon: Camera,
    label: "Camera",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: ImageIcon,
    label: "Gallery",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: FileText,
    label: "Document",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Headphones,
    label: "Audio",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: MapPin,
    label: "Location",
    color: "from-green-500 to-emerald-500",
  },
];

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [sheetOpen, setSheetOpen] =
    useState(false);

  const [recording, setRecording] =
    useState(false);

  return (
    <main className="flex h-screen overflow-hidden bg-[#050816] text-white">
      {/* SIDEBAR OVERLAY */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />

            {/* MOBILE SIDEBAR */}
            <motion.div
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              transition={{
                type: "spring",
                damping: 24,
                stiffness: 200,
              }}
              className="fixed left-0 top-0 z-50 flex h-full w-[340px] flex-col border-r border-white/10 bg-[#070b18]/95 backdrop-blur-3xl lg:hidden"
            >
              <div className="border-b border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-black">
                    FlexChat
                  </h1>

                  <button
                    onClick={() =>
                      setSidebarOpen(false)
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ATTACHMENT SHEET */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{
                y: 500,
              }}
              animate={{
                y: 0,
              }}
              exit={{
                y: 500,
              }}
              transition={{
                type: "spring",
                damping: 24,
                stiffness: 240,
              }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[40px] border-t border-white/10 bg-[#0b1020]/95 p-6 backdrop-blur-3xl"
            >
              <div className="mx-auto mb-6 h-2 w-24 rounded-full bg-white/20" />

              <div className="mb-8 text-center">
                <h2 className="text-2xl font-black">
                  Share Something
                </h2>

                <p className="mt-2 text-white/45">
                  Choose attachment type
                </p>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {attachmentItems.map((item, index) => (
                  <motion.button
                    key={index}
                    whileTap={{
                      scale: 0.92,
                    }}
                    className="flex flex-col items-center gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] p-5"
                  >
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${item.color}`}
                    >
                      <item.icon className="h-7 w-7 text-white" />
                    </div>

                    <span className="text-sm font-medium">
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              <button
                onClick={() => setSheetOpen(false)}
                className="mt-8 w-full rounded-3xl border border-white/10 bg-white/[0.04] py-5 text-lg font-semibold"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <div className="hidden w-[380px] flex-col border-r border-white/10 bg-black/20 backdrop-blur-3xl lg:flex">
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <h1 className="cursor-pointer text-3xl font-black">
                FlexChat
              </h1>
            </Link>

            <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-4 backdrop-blur-3xl lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
              <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-black bg-green-400" />
            </div>

            <div>
              <h2 className="text-xl font-black lg:text-2xl">
                Mayuri
              </h2>

              <p className="mt-1 text-sm text-green-400">
                online now
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Phone className="h-5 w-5" />
            </button>

            <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Video className="h-5 w-5" />
            </button>

            <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 lg:px-8">
          <div className="space-y-6">
            <div className="max-w-[85%] lg:max-w-[60%]">
              <div className="rounded-[28px] rounded-bl-md border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-2xl">
                <p className="leading-relaxed text-white/90">
                  Voice recording interactions feel insanely
                  premium now 😭🔥
                </p>
              </div>
            </div>

            <div className="ml-auto max-w-[85%] lg:max-w-[60%]">
              <div className="rounded-[28px] rounded-br-md bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-4 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
                <p className="leading-relaxed text-white">
                  APK builds are going to feel CRAZY 😈
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INPUT */}
        <div className="border-t border-white/10 bg-black/20 p-4 backdrop-blur-3xl lg:p-6">
          <AnimatePresence mode="wait">
            {!recording ? (
              <motion.div
                key="input"
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -20,
                }}
                className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] px-4 py-3 lg:px-5 lg:py-4"
              >
                <button className="text-white/50">
                  <Smile className="h-6 w-6" />
                </button>

                <input
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent outline-none placeholder:text-white/30"
                />

                <button
                  onClick={() => setSheetOpen(true)}
                  className="text-white/50"
                >
                  <Paperclip className="h-6 w-6" />
                </button>

                {/* HOLD TO RECORD */}
                <motion.button
                  whileTap={{
                    scale: 0.88,
                  }}
                  onMouseDown={() =>
                    setRecording(true)
                  }
                  onTouchStart={() =>
                    setRecording(true)
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
                >
                  <Mic className="h-5 w-5" />
                </motion.button>

                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
                >
                  <SendHorizonal className="h-5 w-5" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="recording"
                initial={{
                  opacity: 0,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                }}
                className="flex items-center gap-4 rounded-[28px] border border-red-500/20 bg-red-500/[0.08] px-5 py-4 backdrop-blur-3xl"
              >
                {/* DELETE */}
                <button
                  onClick={() =>
                    setRecording(false)
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]"
                >
                  <Trash2 className="h-5 w-5 text-red-400" />
                </button>

                {/* LIVE */}
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                    }}
                    className="h-3 w-3 rounded-full bg-red-500"
                  />

                  <span className="font-medium">
                    Recording...
                  </span>
                </div>

                {/* WAVE */}
                <div className="flex flex-1 items-end justify-center gap-[4px]">
                  {Array.from({ length: 20 }).map(
                    (_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: [
                            `${
                              Math.random() * 10 + 10
                            }px`,
                            `${
                              Math.random() * 35 + 20
                            }px`,
                            `${
                              Math.random() * 10 + 10
                            }px`,
                          ],
                        }}
                        transition={{
                          duration:
                            Math.random() * 1 + 0.8,
                          repeat: Infinity,
                        }}
                        className="w-[4px] rounded-full bg-gradient-to-t from-red-500 to-pink-400"
                      />
                    )
                  )}
                </div>

                {/* TIMER */}
                <span className="font-mono text-sm text-white/70">
                  0:12
                </span>

                {/* SEND */}
                <button
                  onClick={() =>
                    setRecording(false)
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 shadow-2xl"
                >
                  <SendHorizonal className="h-5 w-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MOBILE NAV */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/40 px-2 py-3 backdrop-blur-3xl lg:hidden">
          <div className="flex items-center justify-around">
            {navItems.map((item, index) => (
              <motion.button
                key={index}
                whileTap={{
                  scale: 0.9,
                }}
                className="relative flex flex-col items-center gap-2 px-3 py-2"
              >
                {item.active && (
                  <motion.div
                    layoutId="mobile-nav"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20"
                  />
                )}

                <item.icon
                  className={`relative z-10 h-6 w-6 ${
                    item.active
                      ? "text-white"
                      : "text-white/40"
                  }`}
                />

                <span
                  className={`relative z-10 text-[11px] font-medium ${
                    item.active
                      ? "text-white"
                      : "text-white/40"
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}