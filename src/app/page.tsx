"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Message = {
  id: number;
  sender: string;
  me: boolean;
  time: string;
  text?: string;
  image?: string;
  audio?: string;
  replyTo?: string;
  reactions?: string[];
  status?: "sending" | "sent" | "seen";
};

export default function HomePage() {
  const [message, setMessage] =
    useState("");

  const [typing, setTyping] =
    useState(false);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [replyMessage, setReplyMessage] =
    useState<Message | null>(null);

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingTime, setRecordingTime] =
    useState(0);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef = useRef<
    Blob[]
  >([]);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: 1,
        sender: "Mayuri",
        text: "FlexChat looking premium 🔥",
        me: false,
        time: "11:42 PM",
        reactions: ["🔥"],
      },
      {
        id: 2,
        sender: "You",
        text: "Realtime system almost ready 🚀",
        me: true,
        time: "11:43 PM",
        status: "seen",
      },
      {
        id: 3,
        sender: "Mayuri",
        image:
          "https://picsum.photos/500/300",
        text: "Media support",
        me: false,
        time: "11:45 PM",
      },
    ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!message) {
      setTyping(false);
      return;
    }

    setTyping(true);

    const timer = setTimeout(() => {
      setTyping(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(
          (prev) => prev + 1
        );
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: "You",
      text: message,
      me: true,
      time: new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      status: "sending",
      replyTo:
        replyMessage?.text || undefined,
    };

    setMessages((prev) => [
      ...prev,
      newMessage,
    ]);

    setMessage("");
    setReplyMessage(null);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                status: "sent",
              }
            : msg
        )
      );
    }, 700);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                status: "seen",
              }
            : msg
        )
      );
    }, 1500);
  };

  const addReaction = (
    id: number,
    emoji: string
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []),
                emoji,
              ],
            }
          : msg
      )
    );
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
          new MediaRecorder(stream);

        mediaRecorderRef.current =
          recorder;

        recorder.ondataavailable = (
          event
        ) => {
          audioChunksRef.current.push(
            event.data
          );
        };

        recorder.onstop = () => {
          const blob = new Blob(
            audioChunksRef.current,
            {
              type: "audio/webm",
            }
          );

          const audioUrl =
            URL.createObjectURL(blob);

          const voiceMessage: Message =
            {
              id: Date.now(),
              sender: "You",
              audio: audioUrl,
              me: true,
              time:
                new Date().toLocaleTimeString(
                  [],
                  {
                    hour:
                      "2-digit",
                    minute:
                      "2-digit",
                  }
                ),
              status: "sending",
            };

          setMessages((prev) => [
            ...prev,
            voiceMessage,
          ]);

          setTimeout(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id ===
                voiceMessage.id
                  ? {
                      ...msg,
                      status:
                        "seen",
                    }
                  : msg
              )
            );
          }, 1500);

          audioChunksRef.current =
            [];

          setRecordingTime(0);
        };

        recorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error(error);
      }
    };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    setIsRecording(false);
  };

  const rooms = [
    {
      name: "Global",
      unread: 2,
      active: true,
    },
    {
      name: "Gaming",
      unread: 0,
      active: false,
    },
    {
      name: "Coding",
      unread: 4,
      active: false,
    },
    {
      name: "Music",
      unread: 1,
      active: false,
    },
  ];

  return (
    <main className="h-screen bg-[#0a0a0f] text-white flex overflow-hidden">
      <AnimatePresence>
        {sidebarOpen && (
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
              setSidebarOpen(false)
            }
            className="fixed inset-0 bg-black/70 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}

      <motion.aside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -400,
        }}
        transition={{
          type: "spring",
          damping: 20,
        }}
        className="fixed md:relative z-50 md:z-0 w-[330px] h-full bg-[#0f0f14]/95 backdrop-blur-3xl border-r border-white/5 flex flex-col md:translate-x-0"
      >
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
                FlexChat
              </h1>

              <p className="text-sm text-zinc-500 mt-2">
                Premium Messaging
              </p>
            </div>

            <button
              onClick={() =>
                setSidebarOpen(false)
              }
              className="md:hidden text-2xl"
            >
              ✕
            </button>
          </div>

          <input
            placeholder="Search..."
            className="w-full mt-6 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-purple-500/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {rooms.map((room) => (
            <motion.button
              whileHover={{
                scale: 1.02,
              }}
              whileTap={{
                scale: 0.98,
              }}
              key={room.name}
              className={`w-full rounded-3xl p-4 text-left border transition ${
                room.active
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-500/20"
                  : "bg-white/[0.03] border-white/5 hover:border-purple-500/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-full bg-black/20 flex items-center justify-center font-bold">
                    {room.name.charAt(0)}
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      {room.name}
                    </h2>

                    <p className="text-xs opacity-60 mt-1">
                      Live room
                    </p>
                  </div>
                </div>

                {room.unread > 0 && (
                  <div className="min-w-[24px] h-6 px-2 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                    {room.unread}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600" />

            <div className="flex-1">
              <h3 className="font-semibold">
                Aatish
              </h3>

              <p className="text-xs text-green-400 mt-1">
                Online
              </p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* CHAT */}

      <section className="flex-1 flex flex-col bg-gradient-to-b from-[#0b0b11] to-[#111118]">
        <div className="border-b border-white/5 px-5 py-4 backdrop-blur-3xl bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setSidebarOpen(true)
              }
              className="md:hidden text-2xl"
            >
              ☰
            </button>

            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center font-bold text-xl">
                G
              </div>

              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#111118]" />
            </div>

            <div>
              <h2 className="font-bold text-xl">
                Global Chat
              </h2>

              <p className="text-sm text-green-400 mt-1">
                24 online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {["📞", "🎥", "🔍", "⋮"].map(
              (icon) => (
                <button
                  key={icon}
                  className="w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05]"
                >
                  {icon}
                </button>
              )
            )}
          </div>
        </div>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className={`flex ${
                msg.me
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div className="max-w-md group">
                {msg.replyTo && (
                  <div className="mb-2 bg-white/[0.03] border-l-4 border-purple-500 rounded-xl px-3 py-2 text-xs text-zinc-400">
                    {msg.replyTo}
                  </div>
                )}

                <div
                  className={`rounded-3xl overflow-hidden border ${
                    msg.me
                      ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-500/20 rounded-br-md"
                      : "bg-white/[0.03] border-white/5 rounded-bl-md"
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="media"
                      className="w-full"
                    />
                  )}

                  <div className="px-5 py-4">
                    {!msg.me && (
                      <p className="text-xs text-purple-300 mb-2">
                        {msg.sender}
                      </p>
                    )}

                    {msg.text && (
                      <p className="text-sm leading-relaxed">
                        {msg.text}
                      </p>
                    )}

                    {msg.audio && (
                      <audio
                        controls
                        src={msg.audio}
                        className="w-full mt-3"
                      />
                    )}

                    {!!msg.reactions
                      ?.length && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.reactions.map(
                          (
                            reaction,
                            i
                          ) => (
                            <div
                              key={i}
                              className="bg-black/20 rounded-full px-2 py-1 text-xs"
                            >
                              {reaction}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex justify-end items-center gap-2 mt-4">
                      <span className="text-[10px] opacity-60">
                        {msg.time}
                      </span>

                      {msg.me && (
                        <span className="text-[10px] text-blue-300">
                          {msg.status ===
                            "sending" &&
                            "⏳"}

                          {msg.status ===
                            "sent" &&
                            "✓"}

                          {msg.status ===
                            "seen" &&
                            "✓✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() =>
                      setReplyMessage(msg)
                    }
                    className="bg-white/[0.03] border border-white/5 rounded-full px-3 py-1 text-sm"
                  >
                    Reply
                  </button>

                  {[
                    "❤️",
                    "🔥",
                    "😂",
                    "👍",
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() =>
                        addReaction(
                          msg.id,
                          emoji
                        )
                      }
                      className="bg-white/[0.03] border border-white/5 rounded-full px-3 py-1 text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          <AnimatePresence>
            {typing && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                }}
                className="flex justify-start"
              >
                <div className="bg-white/[0.03] border border-white/5 rounded-3xl rounded-bl-md px-5 py-4 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" />

                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-100" />

                  <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce delay-200" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {replyMessage && (
            <motion.div
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
                y: 20,
              }}
              className="px-5 pb-3"
            >
              <div className="bg-white/[0.03] border border-white/5 rounded-3xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400">
                    Replying to
                  </p>

                  <p className="text-sm text-zinc-300 mt-1">
                    {replyMessage.text}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setReplyMessage(
                      null
                    )
                  }
                  className="text-xl"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INPUT */}

        <div className="p-5 border-t border-white/5 bg-black/10 backdrop-blur-3xl">
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-3xl px-4 py-3">
            <button className="text-xl">
              📎
            </button>

            <button
              onClick={
                isRecording
                  ? stopRecording
                  : startRecording
              }
              className={`px-4 py-2 rounded-2xl ${
                isRecording
                  ? "bg-red-600"
                  : "bg-white/[0.03]"
              }`}
            >
              {isRecording
                ? `${recordingTime}s`
                : "🎤"}
            </button>

            <input
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  handleSendMessage();
                }
              }}
              placeholder="Message"
              className="flex-1 bg-transparent outline-none placeholder:text-zinc-500"
            />

            <button
              onClick={
                handleSendMessage
              }
              className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 rounded-2xl font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}