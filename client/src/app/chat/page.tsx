"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { motion }
from "framer-motion";

import {
  Search,
  Menu,
  Pin,
  Settings,
  User,
} from "lucide-react";

import Cookies
from "js-cookie";

import { useRouter }
from "next/navigation";

import FlexDock
from "@/components/chat/FlexDock";

import ChatInput
from "@/components/chat/ChatInput";

import { useSocketStore }
from "@/store/socket-store";

import { useChatStore }
from "@/store/chat-store";

import { useConversationStore }
from "@/store/conversation-store";

export default function ChatPage() {

  const router =
    useRouter();

  const {
    socket,
    connectSocket,
    connected,
  }: any =
    useSocketStore();

  const {
    addMessage,
    getMessages,
  }: any =
    useChatStore();

  const {
    conversations,
    updateConversation,
    incrementUnread,
    clearUnread,
  }: any =
    useConversationStore();

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const [replyingTo, setReplyingTo] =
    useState<any>(null);

  const [showSettings, setShowSettings] =
    useState(false);

  const [showProfile, setShowProfile] =
    useState(false);

  const [theme, setTheme] =
    useState("cyan");

  const [activeChat, setActiveChat] =
    useState("No Conversation Selected");

  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState(
    "global-chat"
  );

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {

    const token =
      localStorage.getItem(
        "token"
      );

    if (
      token &&
      !connected
    ) {

      connectSocket(
        token
      );
    }

  }, [
    connected,
    connectSocket,
  ]);

  const messages =
    getMessages?.(
      activeConversationId
    ) || [];

  const filteredConversations =
    Array.isArray(
      conversations
    )
      ? conversations.filter(
          (
            conversation: any
          ) =>
            conversation.name
              ?.toLowerCase()
              .includes(
                search.toLowerCase()
              )
        )
      : [];

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages]);

  const handleTyping = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    setMessage(
      e.target.value
    );
  };

  const handleSend = () => {

    if (!message.trim())
      return;

    const newMessage = {

      id: Date.now(),

      text: message,

      sender: "me",

      time:
        new Date().toLocaleTimeString(),

      conversationId:
        activeConversationId,
    };

    addMessage?.(
      newMessage
    );

    updateConversation?.(
      activeConversationId,
      message
    );

    socket?.emit(
      "send_message",
      newMessage
    );

    setMessage("");

    setReplyingTo(
      null
    );
  };

  const handleLogout =
    () => {

      Cookies.remove(
        "flexchat_token"
      );

      localStorage.removeItem(
        "token"
      );

      router.push(
        "/auth"
      );
    };

  return (

    <div
      className={`flex h-screen overflow-hidden text-white ${
        theme === "purple"
          ? "bg-gradient-to-br from-[#14051f] via-[#22103a] to-[#12061c]"
          : theme === "ocean"
          ? "bg-gradient-to-br from-[#031d33] via-[#0a2f4d] to-[#04111d]"
          : "bg-gradient-to-br from-[#07111f] via-[#0b1730] to-[#07111f]"
      }`}
    >

      {/* SIDEBAR */}

      <div
        className={`${sidebarOpen ? "flex" : "hidden"} w-[340px] border-r border-white/10 bg-white/5 backdrop-blur-2xl lg:flex lg:flex-col`}
      >

        <div className="border-b border-white/10 p-5">

          <h1 className="text-3xl font-bold">
            FlexChat
          </h1>

          <p className="mt-1 text-sm text-cyan-400">
            Premium Messaging
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">

            <Search
              size={18}
              className="text-white/40"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search chats..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
            />

          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-3">

          <div className="space-y-2">

            {filteredConversations.map(
              (
                conversation: any
              ) => (

                <button
                  key={
                    conversation.id
                  }
                  onClick={() => {

                    setActiveChat(
                      conversation.name
                    );

                    setActiveConversationId(
                      conversation.id
                    );

                    clearUnread?.(
                      conversation.id
                    );

                    setSidebarOpen(
                      false
                    );
                  }}
                  className={`flex w-full items-center gap-4 rounded-3xl p-4 transition-all ${
                    activeChat ===
                    conversation.name
                      ? "bg-cyan-500/20"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >

                  <div className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />

                  <div className="flex-1 text-left">

                    <div className="flex items-center justify-between">

                      <h2 className="font-semibold">

                        {conversation.name}

                      </h2>

                      <Pin
                        size={14}
                        className="text-white/40"
                      />

                    </div>

                    <p className="truncate text-sm text-white/50">

                      {
                        conversation.lastMessage
                      }

                    </p>

                  </div>

                </button>
              )
            )}

          </div>

        </div>

      </div>

      {/* MAIN */}

      <div className="flex flex-1 flex-col">

        {/* HEADER */}

        <div className="border-b border-white/10 p-5">

          <div className="relative flex items-center justify-between">

            <div className="flex items-center gap-3">

              <button
                onClick={() =>
                  setSidebarOpen(
                    !sidebarOpen
                  )
                }
                className="rounded-2xl bg-white/10 p-3 lg:hidden"
              >

                <Menu size={20} />

              </button>

              <div>

                <h1 className="text-2xl font-bold">

                  {activeChat}

                </h1>

                <button
                  onClick={() =>
                    setShowProfile(
                      true
                    )
                  }
                  className="mt-2 flex items-center gap-2 text-sm text-white/50 hover:text-cyan-300"
                >

                  <User size={15} />

                  Conversation Info

                </button>

                <p className="mt-2 text-sm text-cyan-400">

                  {connected
                    ? "Online"
                    : "Offline"}

                </p>

              </div>

            </div>

            {/* DOCK */}

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">

              <FlexDock
                setShowProfile={
                  setShowProfile
                }
                setShowSettings={
                  setShowSettings
                }
                handleLogout={
                  handleLogout
                }
              />

            </div>

          </div>

        </div>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto p-6">

          <div className="space-y-4">

            {messages.length ===
              0 && (

              <div className="flex h-[65vh] items-center justify-center">

                <div className="text-center text-white/40">

                  <h2 className="text-3xl font-bold">

                    No Messages Yet

                  </h2>

                </div>

              </div>
            )}

            {messages.map(
              (
                msg: any
              ) => (

                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender ===
                    "me"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  <motion.div
                    whileHover={{
                      scale: 1.01,
                    }}
                    className={`max-w-[340px] rounded-3xl px-5 py-4 shadow-xl ${
                      msg.sender ===
                      "me"
                        ? "bg-cyan-500 text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >

                    <p className="text-sm leading-relaxed">

                      {msg.text}

                    </p>

                  </motion.div>

                </div>
              )
            )}

            <div ref={bottomRef} />

          </div>

        </div>

        {/* SETTINGS */}

        {showSettings && (

          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">

            <div className="w-[420px] rounded-3xl border border-white/10 bg-[#0f172a] p-6">

              <div className="mb-6 flex items-center justify-between">

                <h2 className="text-2xl font-bold">

                  Settings

                </h2>

                <button
                  onClick={() =>
                    setShowSettings(
                      false
                    )
                  }
                >

                  ✕

                </button>

              </div>

              <div className="space-y-4">

                {[
                  "cyan",
                  "purple",
                  "ocean",
                ].map(
                  (
                    item
                  ) => (

                    <button
                      key={item}
                      onClick={() =>
                        setTheme(
                          item
                        )
                      }
                      className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-5 py-4 capitalize"
                    >

                      {item}

                      {theme ===
                        item && "✓"}

                    </button>
                  )
                )}

              </div>

            </div>

          </div>
        )}

        {/* PROFILE */}

        {showProfile && (

          <div className="absolute inset-y-0 right-0 z-50 w-[380px] border-l border-white/10 bg-[#0f172a]/95 p-6 backdrop-blur-2xl">

            <div className="flex items-center justify-between">

              <h2 className="text-2xl font-bold">

                Profile

              </h2>

              <button
                onClick={() =>
                  setShowProfile(
                    false
                  )
                }
              >

                ✕

              </button>

            </div>

            <div className="mt-8 flex flex-col items-center">

              <div className="h-28 w-28 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />

              <h3 className="mt-5 text-2xl font-bold">

                {activeChat}

              </h3>

            </div>

          </div>
        )}

        {/* INPUT */}

        <ChatInput
          message={message}
          setMessage={setMessage}
          handleSend={handleSend}
          handleTyping={handleTyping}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
        />

      </div>

    </div>
  );
}