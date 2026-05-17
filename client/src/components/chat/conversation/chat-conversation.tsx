"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FileText,
  ImageIcon,
  Mic,
  RefreshCw,
  SendHorizonal,
} from "lucide-react";

import { motion } from "framer-motion";

import StoriesRow from "./stories-row";

import MessageStatus from "@/components/chat/MessageStatus";
import { useAuth } from "@/hooks/useAuth";
import { getMessages } from "@/services/message.service";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import {
  useSocketStore,
} from "@/store/socket-store";
import { useConversationStore } from "@/stores/conversation.store";

const VIRTUAL_WINDOW_SIZE = 120;

function formatMessageTime(createdAt?: string) {
  if (!createdAt) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatDateDivider(createdAt?: string) {
  if (!createdAt) {
    return "";
  }

  const date = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() ===
      today.getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

function isSameMessageDay(
  left?: string,
  right?: string
) {
  if (!left || !right) {
    return false;
  }

  return (
    new Date(left).toDateString() ===
    new Date(right).toDateString()
  );
}

function isImageAttachment(url: string) {
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(url);
}

function MessageSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5 sm:px-6">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className={`flex ${
            index % 3 === 0
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <div className="h-16 w-[min(72%,420px)] animate-pulse rounded-3xl bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export default function ChatConversation() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const seenMessageIdsRef = useRef<Set<string>>(
    new Set()
  );

  const activeConversation = useConversationStore(
    (state) => state.activeConversation
  );
  const socket = useSocketStore((state) => state.socket);
  const isConnected = useSocketStore(
    (state) => state.isConnected
  );
  const connectionVersion = useSocketStore(
    (state) => state.connectionVersion
  );
  const messages = useSocketStore((state) => state.messages);
  const typingUsers = useSocketStore((state) => state.typingUsers);
  const onlineUsers = useSocketStore((state) => state.onlineUsers);
  const joinConversation = useSocketStore(
    (state) => state.joinConversation
  );
  const leaveConversation = useSocketStore(
    (state) => state.leaveConversation
  );
  const sendSocketMessage = useSocketStore(
    (state) => state.sendMessage
  );
  const startTyping = useSocketStore(
    (state) => state.startTyping
  );
  const stopTyping = useSocketStore(
    (state) => state.stopTyping
  );
  const retryMessage = useSocketStore(
    (state) => state.retryMessage
  );
  const setConversationMessages = useSocketStore(
    (state) => state.setConversationMessages
  );
  const markConversationRead = useConversationStore(
    (state) => state.markConversationRead
  );

  const conversationId = activeConversation?.id ?? null;
  const visibleMessages = useMemo(() => {
    if (!conversationId) {
      return [];
    }

    return messages
      .filter(
        (message) =>
          message.conversationId === conversationId
      )
      .slice(-VIRTUAL_WINDOW_SIZE);
  }, [
    conversationId,
    messages,
  ]);

  const remoteTypingUsers = useMemo(
    () =>
      typingUsers.filter(
        (typingUserId) =>
          typingUserId !== user?.id
      ),
    [
      typingUsers,
      user?.id,
    ]
  );

  const isOnline =
    !!activeConversation?.id &&
    onlineUsers.includes(activeConversation.id);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    joinConversation(conversationId);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      leaveConversation(conversationId);
    };
  }, [
    conversationId,
    joinConversation,
    leaveConversation,
  ]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
      }
    });

    getMessages(conversationId)
      .then((history) => {
        if (cancelled) {
          return;
        }

        setConversationMessages(
          conversationId,
          history.map((message) => ({
            ...message,
            status: message.status ?? "sent",
          }))
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    connectionVersion,
    setConversationMessages,
  ]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    markConversationRead(conversationId);
  }, [
    conversationId,
    markConversationRead,
    visibleMessages.length,
  ]);

  useEffect(() => {
    if (!isNearBottomRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    visibleMessages.length,
    remoteTypingUsers.length,
  ]);

  useEffect(() => {
    if (!conversationId || !user?.id || !isConnected) {
      return;
    }

    const unreadRemoteMessages = visibleMessages.filter(
      (message) =>
        message.senderId !== user.id &&
        message.senderId !== "me" &&
        message.status !== "read"
    );

    unreadRemoteMessages.forEach((message) => {
      if (
        seenMessageIdsRef.current.has(message.id)
      ) {
        return;
      }

      seenMessageIdsRef.current.add(message.id);

      socket.emit(SOCKET_EVENTS.MARK_MESSAGE_SEEN, {
        conversationId,
        messageId: message.id,
      });
    });
  }, [
    conversationId,
    isConnected,
    socket,
    user?.id,
    visibleMessages,
  ]);

  useEffect(() => {
    seenMessageIdsRef.current.clear();
  }, [conversationId]);

  function handleScroll() {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    isNearBottomRef.current =
      element.scrollHeight -
        element.scrollTop -
        element.clientHeight <
      180;
  }

  function handleTyping(value: string) {
    setText(value);

    if (!conversationId) {
      return;
    }

    startTyping(conversationId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 900);
  }

  function handleSend() {
    if (!conversationId) {
      return;
    }

    const nextText = text.trim();

    if (!nextText) {
      return;
    }

    sendSocketMessage({
      conversationId,
      text: nextText,
    });

    setText("");
    stopTyping(conversationId);
  }

  if (!activeConversation) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-[#070B14] px-6 text-center">
        <div className="max-w-sm rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-purple-950/20 backdrop-blur-2xl">
          <h2 className="text-xl font-semibold text-white">
            Select a conversation
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Your realtime messages will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#070B14]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-base font-bold text-white sm:h-14 sm:w-14 sm:text-lg">
            {activeConversation.name?.charAt(0) ?? "F"}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-semibold text-white">
              {activeConversation.name ?? "FlexChat"}
            </h2>

            <p
              className={`text-sm ${
                remoteTypingUsers.length
                  ? "text-cyan-300"
                  : isOnline
                  ? "text-green-400"
                  : "text-zinc-500"
              }`}
            >
              {remoteTypingUsers.length
                ? "typing..."
                : isOnline
                ? "Online"
                : "Realtime ready"}
            </p>
          </div>
        </div>
      </div>

      <StoriesRow />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
      >
        {loading ? (
          <MessageSkeleton />
        ) : (
          <>
            {activeConversation.unreadCount ? (
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-purple-500/30" />
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-200">
                  Unread messages
                </span>
                <div className="h-px flex-1 bg-purple-500/30" />
              </div>
            ) : null}

            {visibleMessages.map((message, index) => {
              const mine =
                message.senderId === user?.id ||
                message.senderId === "me";
              const previous =
                visibleMessages[index - 1];
              const grouped =
                previous?.senderId === message.senderId &&
                isSameMessageDay(
                  previous?.createdAt,
                  message.createdAt
                );
              const showDateDivider =
                !previous ||
                !isSameMessageDay(
                  previous.createdAt,
                  message.createdAt
                );

              return (
                <Fragment key={message.id}>
                  {showDateDivider ? (
                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-zinc-400 backdrop-blur-xl">
                        {formatDateDivider(
                          message.createdAt
                        )}
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  ) : null}

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 10,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    transition={{
                      duration: 0.18,
                    }}
                    className={`flex ${
                      grouped
                        ? "mt-1"
                        : "mt-4"
                    } ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm text-white shadow-lg sm:max-w-[70%] sm:px-5 sm:py-4 ${
                        mine
                          ? "rounded-br-md bg-gradient-to-br from-purple-600 to-fuchsia-600"
                          : "rounded-bl-md border border-white/10 bg-white/[0.04] backdrop-blur-xl"
                      }`}
                    >
                      {message.replyTo ? (
                        <div className="mb-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/70">
                          <p className="font-medium text-white/85">
                            Reply
                          </p>
                          <p className="mt-1 line-clamp-2">
                            {
                              message.replyTo
                                .text
                            }
                          </p>
                        </div>
                      ) : null}

                      {message.attachment ? (
                        isImageAttachment(
                          message.attachment
                        ) ? (
                          <a
                            href={
                              message.attachment
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mb-3 block overflow-hidden rounded-2xl border border-white/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                message.attachment
                              }
                              alt="Attachment"
                              className="max-h-72 w-full object-cover"
                            />
                          </a>
                        ) : (
                          <a
                            href={
                              message.attachment
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-xs text-white/80"
                          >
                            <FileText size={16} />
                            <span className="truncate">
                              Attachment
                            </span>
                          </a>
                        )
                      ) : null}

                      {message.audio ? (
                        <audio
                          controls
                          src={message.audio}
                          className="mb-3 w-full max-w-[260px]"
                        />
                      ) : null}

                      {message.text ? (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.text}
                        </p>
                      ) : null}

                      {message.reactions?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {message.reactions.map(
                            (reaction) => (
                              <span
                                key={
                                  reaction.emoji
                                }
                                className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs"
                              >
                                {reaction.emoji}{" "}
                                {
                                  reaction.count
                                }
                              </span>
                            )
                          )}
                        </div>
                      ) : null}

                      <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-white/65">
                        <span>
                          {formatMessageTime(
                            message.createdAt
                          )}
                        </span>

                        {mine ? (
                          message.status ===
                          "failed" ? (
                            <button
                              type="button"
                              onClick={() =>
                                retryMessage(
                                  message.id
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-white/20"
                            >
                              <RefreshCw
                                size={11}
                              />
                              Retry
                            </button>
                          ) : (
                            <MessageStatus
                              status={
                                message.status
                              }
                            />
                          )
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                </Fragment>
              );
            })}

            {remoteTypingUsers.length ? (
              <div className="mt-4 flex justify-start">
                <div className="rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        animate={{
                          y: [0, -5, 0],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: dot * 0.15,
                        }}
                        className="h-2 w-2 rounded-full bg-cyan-300"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-5 sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2 sm:gap-3">
          <button className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:bg-white/[0.06] sm:flex">
            <ImageIcon
              size={20}
              className="text-zinc-400"
            />
          </button>

          <div className="min-w-0 flex-1 rounded-3xl border border-white/10 bg-white/[0.03] px-4 sm:px-5">
            <textarea
              rows={1}
              value={text}
              onChange={(event) =>
                handleTyping(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a message..."
              className="max-h-36 min-h-[52px] w-full resize-none bg-transparent py-4 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <button className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:bg-white/[0.06] sm:flex">
            <Mic
              size={20}
              className="text-zinc-400"
            />
          </button>

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-2xl shadow-purple-600/30 transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizonal size={21} />
          </button>
        </div>
      </div>
    </section>
  );
}
