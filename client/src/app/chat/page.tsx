"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import axios from "axios";

import Cookies from "js-cookie";

import {
  useRouter,
} from "next/navigation";

import { socket } from "@/lib/socket";

interface Message {
  id: number;

  text?: string;

  image?: string;

  audio?: string;

  sender: "me" | "other";

  time: string;

  seen?: boolean;
}

interface Chat {
  id: number;

  title: string;
}

export default function ChatPage() {

  const router =
    useRouter();

  const [message, setMessage] =
    useState("");

  const [typing, setTyping] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState(0);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [activeChat, setActiveChat] =
    useState("Mayuri");

  const [recording, setRecording] =
    useState(false);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [chats, setChats] =
    useState<Chat[]>([]);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const audioChunksRef =
    useRef<Blob[]>([]);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /* AUTH CHECK */
  useEffect(() => {

    const token =
      Cookies.get(
        "flexchat_token"
      );

    if (!token) {

      router.push(
        "/auth"
      );
    }

  }, [router]);

  /* FETCH CHATS */
  useEffect(() => {

    const fetchChats =
      async () => {

        try {

          const res =
            await axios.get(
              "http://localhost:5000/conversations"
            );

          setChats(
            res.data
          );

        } catch (err) {

          console.error(err);
        }
      };

    fetchChats();

  }, []);

  /* SOCKETS */
  useEffect(() => {

    socket.on(
      "receive_message",
      (data: Message) => {

        setMessages((prev) => [
          ...prev,
          data,
        ]);
      }
    );

    socket.on(
      "online_users",
      (count: number) => {

        setOnlineUsers(count);
      }
    );

    socket.on(
      "user_typing",
      () => {

        setTyping(true);
      }
    );

    socket.on(
      "user_stop_typing",
      () => {

        setTyping(false);
      }
    );

    return () => {

      socket.off(
        "receive_message"
      );

      socket.off(
        "online_users"
      );

      socket.off(
        "user_typing"
      );

      socket.off(
        "user_stop_typing"
      );
    };

  }, []);

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

    socket.emit(
      "typing"
    );

    setTimeout(() => {

      socket.emit(
        "stop_typing"
      );

    }, 1000);
  };

  const handleSend = () => {

    if (!message.trim())
      return;

    const currentTime =
      new Date().toLocaleTimeString(
        [],
        {
          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      );

    const payload = {
      id: Date.now(),

      text: message,

      sender: "me" as const,

      time: currentTime,

      seen: false,
    };

    setMessages((prev) => [
      ...prev,
      payload,
    ]);

    socket.emit(
      "send_message",
      payload
    );

    setMessage("");
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      e.target.files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      const currentTime =
        new Date().toLocaleTimeString(
          [],
          {
            hour:
              "2-digit",

            minute:
              "2-digit",
          }
        );

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),

          image:
            reader.result as string,

          sender: "me",

          time: currentTime,
        },
      ]);
    };

    reader.readAsDataURL(file);
  };

  const startRecording =
    async () => {

      try {

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
            }
          );

        const recorder =
          new MediaRecorder(
            stream
          );

        mediaRecorderRef.current =
          recorder;

        audioChunksRef.current =
          [];

        recorder.ondataavailable =
          (
            event
          ) => {

            audioChunksRef.current.push(
              event.data
            );
          };

        recorder.onstop =
          () => {

            const audioBlob =
              new Blob(
                audioChunksRef.current,
                {
                  type:
                    "audio/webm",
                }
              );

            const audioUrl =
              URL.createObjectURL(
                audioBlob
              );

            const currentTime =
              new Date().toLocaleTimeString(
                [],
                {
                  hour:
                    "2-digit",

                  minute:
                    "2-digit",
                }
              );

            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),

                audio:
                  audioUrl,

                sender: "me",

                time: currentTime,
              },
            ]);
          };

        recorder.start();

        setRecording(true);

      } catch (err) {

        console.error(err);
      }
    };

  const stopRecording =
    () => {

      mediaRecorderRef.current?.stop();

      setRecording(false);
    };

  const handleLogout =
    () => {

      Cookies.remove(
        "flexchat_token"
      );

      localStorage.removeItem(
        "flexchat_user"
      );

      router.push(
        "/auth"
      );
    };

  return (
    <div className="flex h-screen overflow-hidden bg-[#07111f] text-white">

      {/* MOBILE SIDEBAR */}

      <AnimatePresence>

        {sidebarOpen && (
          <>
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
              onClick={() =>
                setSidebarOpen(
                  false
                )
              }
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />

            <motion.div
              initial={{
                x: -350,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: -350,
              }}
              className="fixed left-0 top-0 z-50 flex h-full w-[320px] flex-col border-r border-white/10 bg-[#081320] lg:hidden"
            >

              <div className="border-b border-white/10 p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <h1 className="text-2xl font-bold">
                      FlexChat
                    </h1>

                    <p className="text-sm text-cyan-400">
                      Mobile Premium
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setSidebarOpen(
                        false
                      )
                    }
                    className="rounded-xl bg-white/10 px-3 py-2"
                  >

                    ✕

                  </button>

                </div>

              </div>

              <div className="flex-1 overflow-y-auto p-3">

                <div className="space-y-2">

                  {Array.isArray(chats) &&
                    chats.map(
                      (chat: any) => (

                        <button
                          key={chat.id}
                          onClick={() =>
                            setActiveChat(
                              chat.title
                            )
                          }
                          className="flex w-full items-center gap-4 rounded-2xl bg-white/5 p-4 hover:bg-white/10"
                        >

                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500" />

                          <div className="text-left">

                            <h2 className="font-semibold text-white">
                              {chat.title}
                            </h2>

                            <p className="text-sm text-white/50">
                              Active now
                            </p>

                          </div>

                        </button>
                      )
                    )}

                </div>

              </div>

            </motion.div>
          </>
        )}

      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}

      <div className="hidden w-[320px] flex-col border-r border-white/10 bg-black/20 lg:flex">

        <div className="border-b border-white/10 p-5">

          <h1 className="text-3xl font-bold">
            FlexChat
          </h1>

          <p className="mt-1 text-sm text-cyan-400">
            Premium Messaging
          </p>

        </div>

        <div className="flex-1 overflow-y-auto p-3">

          <div className="space-y-2">

            {Array.isArray(chats) &&
              chats.map(
                (chat: any) => (

                  <button
                    key={chat.id}
                    onClick={() =>
                      setActiveChat(
                        chat.title
                      )
                    }
                    className={`flex w-full items-center gap-4 rounded-2xl p-4 transition ${
                      activeChat ===
                      chat.title
                        ? "bg-cyan-500/20"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >

                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500" />

                    <div className="text-left">

                      <h2 className="font-semibold">
                        {chat.title}
                      </h2>

                      <p className="text-sm text-white/50">
                        Active now
                      </p>

                    </div>

                  </button>
                )
              )}

          </div>

        </div>

      </div>

      {/* MAIN CHAT */}

      <div className="flex flex-1 flex-col">

        <div className="border-b border-white/10 p-5">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-2xl font-bold">
                {activeChat}
              </h2>

              <p className="text-sm text-cyan-400">
                {onlineUsers} online
              </p>

            </div>

            <button
              onClick={
                handleLogout
              }
              className="rounded-2xl bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30"
            >

              Logout

            </button>

          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {messages.length ===
            0 && (

            <div className="flex h-full items-center justify-center text-white/40">

              Start chatting in FlexChat

            </div>
          )}

          {messages.map(
            (msg) => (

              <div
                key={msg.id}
                className={`mb-4 flex ${
                  msg.sender ===
                  "me"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div className="max-w-[320px] rounded-3xl bg-cyan-500 px-5 py-3 text-white shadow-lg">

                  {msg.text && (
                    <p>
                      {msg.text}
                    </p>
                  )}

                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="uploaded"
                      className="rounded-2xl"
                    />
                  )}

                  {msg.audio && (
                    <audio
                      controls
                      src={msg.audio}
                    />
                  )}

                  <div className="mt-2 text-right text-xs text-white/70">

                    {msg.time}

                  </div>

                </div>

              </div>
            )
          )}

          <div ref={bottomRef} />

        </div>

        {/* INPUT */}

        <div className="border-t border-white/10 p-4">

          {typing && (

            <p className="mb-2 text-sm text-cyan-400">

              typing...

            </p>
          )}

          <div className="flex items-center gap-3">

            <input
              value={message}
              onChange={
                handleTyping
              }
              placeholder="Type a message..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-white/30"
            />

            <input
              type="file"
              accept="image/*"
              onChange={
                handleImageUpload
              }
              className="hidden"
              id="imageUpload"
            />

            <label
              htmlFor="imageUpload"
              className="cursor-pointer rounded-2xl bg-white/10 px-4 py-4 hover:bg-white/20"
            >

              📎

            </label>

            {!recording ? (

              <button
                onClick={
                  startRecording
                }
                className="rounded-2xl bg-white/10 px-4 py-4 hover:bg-white/20"
              >

                🎤

              </button>

            ) : (

              <button
                onClick={
                  stopRecording
                }
                className="rounded-2xl bg-red-500 px-4 py-4"
              >

                ⏹

              </button>

            )}

            <button
              onClick={
                handleSend
              }
              className="rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-black hover:bg-cyan-400"
            >

              Send

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}