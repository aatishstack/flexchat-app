"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bell,
  Check,
  Compass,
  FileText,
  ImageIcon,
  Pencil,
  Phone,
  RefreshCw,
  SendHorizonal,
  Share2,
  SmilePlus,
  Sparkles,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import MessageStatus from "@/components/chat/MessageStatus";
import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useMessagesQuery } from "@/hooks/queries/use-messages-query";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteMessage,
  editMessage,
  reactToMessage,
} from "@/services/message.service";
import {
  MEDIA_LIMITS,
  getUploadValidationError,
  uploadImage,
} from "@/services/upload.service";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import {
  Message,
  useSocketStore,
} from "@/store/socket-store";
import { useCallStore } from "@/store/call-store";
import { useNotificationStore } from "@/store/notification-store";
import { useToastStore } from "@/store/toast-store";
import { updateConversationInQueryCache } from "@/lib/conversation-query-cache";
import type { ConversationQueryCache } from "@/lib/conversation-query-cache";
import { queryKeys } from "@/lib/query-keys";
import {
  formatDisplayName,
  getAvatarInitial,
} from "@/lib/user-display";
import { useConversationStore } from "@/stores/conversation.store";
import { mergeMessageIntoQueryCache } from "@/lib/message-query-cache";
import type { MessageQueryCache } from "@/lib/message-query-cache";

const RENDER_WINDOW_SIZE = 360;
const EMPTY_MESSAGES: Message[] = [];
const MESSAGE_TIME_FORMATTER =
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  });
const DATE_DIVIDER_FORMATTER =
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });
const DATE_DIVIDER_WITH_YEAR_FORMATTER =
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function hasOnlinePeer(
  memberIds: string[] | undefined,
  onlineUsers: ReadonlySet<string>,
  currentUserId?: string
) {
  return (
    memberIds?.some(
      (memberId) =>
        memberId !== currentUserId &&
        onlineUsers.has(memberId)
    ) ?? false
  );
}

function getConversationAvatar(
  conversation: {
    avatar?: string | null;
    members?: {
      id: string;
      avatar?: string | null;
    }[];
  },
  currentUserId?: string
) {
  return (
    conversation.avatar ??
    conversation.members?.find(
      (member) =>
        member.id !== currentUserId &&
        member.avatar
    )?.avatar ??
    null
  );
}

function formatMessageTime(createdAt?: string) {
  if (!createdAt) {
    return "";
  }

  return MESSAGE_TIME_FORMATTER.format(
    new Date(createdAt)
  );
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

  return (
    date.getFullYear() === today.getFullYear()
      ? DATE_DIVIDER_FORMATTER
      : DATE_DIVIDER_WITH_YEAR_FORMATTER
  ).format(date);
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

function isVideoAttachment(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url);
}

function getAttachmentLabel(url: string) {
  try {
    const parsedUrl = new URL(url);
    const filename =
      parsedUrl.pathname.split("/").pop();

    return filename
      ? decodeURIComponent(filename)
      : "Attachment";
  } catch {
    return "Attachment";
  }
}

function sortMessages(messages: Message[]) {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt
      ? new Date(left.createdAt).getTime()
      : 0;
    const rightTime = right.createdAt
      ? new Date(right.createdAt).getTime()
      : 0;

    return leftTime - rightTime;
  });
}

function mergeMessages(
  serverMessages: Message[],
  realtimeMessages: Message[]
) {
  const merged: Message[] = [];
  const messageIndexByKey = new Map<
    string,
    number
  >();

  [...serverMessages, ...realtimeMessages].forEach(
    (message) => {
      const messageKeys = [
        message.id,
        message.tempId,
      ].filter(Boolean) as string[];
      const existingIndex = messageKeys
        .map((key) =>
          messageIndexByKey.get(key)
        )
        .find(
          (index) => index !== undefined
        );

      if (existingIndex === undefined) {
        merged.push(message);
        messageKeys.forEach((key) => {
          messageIndexByKey.set(
            key,
            merged.length - 1
          );
        });
        return;
      }

      merged[existingIndex] = {
        ...merged[existingIndex],
        ...message,
        optimistic:
          message.optimistic ??
          merged[existingIndex].optimistic,
      };
      [
        merged[existingIndex].id,
        merged[existingIndex].tempId,
      ]
        .filter(Boolean)
        .forEach((key) => {
          messageIndexByKey.set(
            key as string,
            existingIndex
          );
        });
    }
  );

  return sortMessages(merged);
}

function getTimeAwareGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const period =
    hour < 12
      ? "morning"
      : hour < 17
        ? "afternoon"
        : "evening";

  return `Good ${period}${name ? ` ${formatDisplayName(name)}` : ""}, how can I help you?`;
}

function buildLocalAiResponse({
  prompt,
  messages,
  conversationName,
}: {
  prompt: string;
  messages: Message[];
  conversationName: string;
}) {
  const normalizedPrompt =
    prompt.trim().toLowerCase();
  const recentMessages = messages
    .filter(
      (message) =>
        !message.deletedAt &&
        (message.text?.trim() ||
          message.attachment ||
          message.audio)
    )
    .slice(-12);
  const recentTextMessages =
    recentMessages
      .map((message) => message.text?.trim())
      .filter(Boolean) as string[];

  if (
    normalizedPrompt.includes("summar") ||
    normalizedPrompt.includes("unread")
  ) {
    if (!recentTextMessages.length) {
      return `There is not enough recent text in ${conversationName} to summarize yet.`;
    }

    return `Recent ${conversationName} context: ${recentTextMessages
      .slice(-5)
      .map((text, index) => `${index + 1}. ${text}`)
      .join(" ")}`;
  }

  if (
    normalizedPrompt.includes("reply") ||
    normalizedPrompt.includes("rewrite") ||
    normalizedPrompt.includes("write")
  ) {
    const seed =
      recentTextMessages.at(-1) ??
      prompt.trim();

    return `Try this: "${seed ? `Thanks for the update. ${seed.length > 90 ? "I will take a closer look and get back to you shortly." : "That works for me."}` : "Thanks for the update. I will get back to you shortly."}"`;
  }

  if (
    normalizedPrompt.includes("media") ||
    normalizedPrompt.includes("photo") ||
    normalizedPrompt.includes("video")
  ) {
    return "For media, keep images under 10 MB and videos under 25 MB. Short videos render inline in chat, while oversized videos need compression before sending.";
  }

  if (!prompt.trim()) {
    return "Ask me to summarize recent messages, draft a reply, clean up a message, or check media sending limits.";
  }

  return `For ${conversationName}, I would keep it short and warm: "${prompt.trim().slice(0, 180)}"`;
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

type ChatMessageRowProps = {
  message: Message;
  previous?: Message;
  mine: boolean;
  reducedMotion: boolean;
  onRetry: (messageId: string) => void;
  onEdit: (
    message: Message,
    text: string
  ) => Promise<boolean>;
  onDelete: (
    message: Message
  ) => Promise<boolean>;
  onReact: (
    message: Message,
    emoji: string
  ) => Promise<boolean>;
  onShare: (message: Message) => void;
};

const ChatMessageRow = memo(
  function ChatMessageRow({
    message,
    previous,
    mine,
    reducedMotion,
    onRetry,
    onEdit,
    onDelete,
    onReact,
    onShare,
  }: ChatMessageRowProps) {
    const [menuOpen, setMenuOpen] =
      useState(false);
    const [isEditing, setIsEditing] =
      useState(false);
    const [draftText, setDraftText] =
      useState(message.text ?? "");
    const [isMutating, setIsMutating] =
      useState(false);
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
    const isDeleted = !!message.deletedAt;
    const isSettled =
      !message.optimistic &&
      message.status !== "sending";
    const canEdit =
      mine &&
      isSettled &&
      !isDeleted &&
      !message.attachment &&
      !message.audio &&
      !!message.text;
    const canDelete =
      mine && isSettled && !isDeleted;

    async function submitEdit() {
      const nextText = draftText.trim();

      if (!nextText || nextText === message.text) {
        setIsEditing(false);
        setDraftText(message.text ?? "");
        return;
      }

      setIsMutating(true);
      const ok = await onEdit(message, nextText);
      setIsMutating(false);

      if (ok) {
        setIsEditing(false);
        setMenuOpen(false);
      }
    }

    async function submitDelete() {
      setIsMutating(true);
      const ok = await onDelete(message);
      setIsMutating(false);

      if (ok) {
        setMenuOpen(false);
      }
    }

    async function submitReaction(emoji: string) {
      setIsMutating(true);
      const ok = await onReact(message, emoji);
      setIsMutating(false);

      if (ok) {
        setMenuOpen(false);
      }
    }

    return (
      <Fragment>
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
          initial={
            reducedMotion
              ? false
              : {
                  opacity: 0,
                  y: 10,
                  scale: 0.98,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration:
              reducedMotion
                ? 0
                : 0.18,
          }}
          className={`flex ${
            grouped
              ? "mt-1"
              : "mt-4"
          } ${
            mine
              ? "justify-end"
              : "justify-start"
          } group/message relative`}
        >
          <div
            className={`relative max-w-[86%] rounded-3xl px-4 py-3 text-sm text-white shadow-[0_14px_45px_rgba(0,0,0,0.22)] sm:max-w-[70%] sm:px-5 sm:py-4 ${
              mine
                ? "rounded-br-md bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-purple-950/30"
                : "rounded-bl-md border border-white/10 bg-white/[0.055] backdrop-blur-2xl"
            } ${
              message.status === "failed"
                ? "ring-1 ring-red-400/35"
                : ""
            } ${
              isDeleted
                ? "border border-white/10 bg-white/[0.035] text-white/60"
                : ""
            }`}
          >
            {message.replyTo ? (
              <div className="mb-3 rounded-2xl border border-white/10 bg-black/[0.15] px-3 py-2 text-xs text-white/70">
                <p className="font-medium text-white/85">
                  Reply
                </p>
                <p className="mt-1 line-clamp-2">
                  {message.replyTo.text}
                </p>
              </div>
            ) : null}

            {isDeleted ? (
              <p className="italic text-white/65">
                Message deleted
              </p>
            ) : null}

            {!isDeleted && message.attachment ? (
              isImageAttachment(
                message.attachment
              ) ? (
                <a
                  href={message.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 block overflow-hidden rounded-2xl border border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.attachment}
                    alt="Attachment"
                    className="max-h-72 w-full object-cover"
                  />
                </a>
              ) : isVideoAttachment(
                  message.attachment
                ) ? (
                <video
                  controls
                  preload="metadata"
                  playsInline
                  src={message.attachment}
                  className="mb-3 max-h-80 w-full rounded-2xl border border-white/10 bg-black object-contain"
                />
              ) : (
                <a
                  href={message.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/[0.15] px-3 py-3 text-xs text-white/80"
                >
                  <FileText size={16} />
                  <span className="truncate">
                    {getAttachmentLabel(
                      message.attachment
                    )}
                  </span>
                </a>
              )
            ) : null}

            {!isDeleted && message.audio ? (
              <audio
                controls
                src={message.audio}
                className="mb-3 w-full max-w-[260px]"
              />
            ) : null}

            {!isDeleted && isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={draftText}
                  onChange={(event) =>
                    setDraftText(
                      event.target.value.slice(
                        0,
                        4000
                      )
                    )
                  }
                  autoFocus
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm leading-relaxed text-white outline-none transition focus:border-white/35"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftText(
                        message.text ?? ""
                      );
                      setIsEditing(false);
                    }}
                    disabled={isMutating}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
                    aria-label="Cancel edit"
                  >
                    <X size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void submitEdit();
                    }}
                    disabled={
                      isMutating ||
                      !draftText.trim()
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-purple-700 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Save edit"
                  >
                    <Check size={15} />
                  </button>
                </div>
              </div>
            ) : !isDeleted && message.text ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.text}
              </p>
            ) : null}

            {!isDeleted && message.reactions?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {message.reactions.map(
                  (reaction) => (
                    <span
                      key={reaction.emoji}
                      className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs"
                    >
                      {reaction.emoji}{" "}
                      {reaction.count}
                    </span>
                  )
                )}
              </div>
            ) : null}

            {!isEditing ? (
              <div
                className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#07101E]/95 p-1 text-white shadow-2xl shadow-black/35 backdrop-blur-xl transition max-sm:bottom-full max-sm:left-auto max-sm:right-0 max-sm:top-auto max-sm:mb-2 max-sm:translate-y-0 ${
                  mine
                    ? "right-full mr-2"
                    : "left-full ml-2"
                } ${
                  menuOpen
                    ? "opacity-100"
                    : "pointer-events-none opacity-0 group-hover/message:pointer-events-auto group-hover/message:opacity-100 group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100"
                }`}
              >
                {!isDeleted ? (
                  <>
                    {["👍", "❤️", "😂"].map(
                      (emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            void submitReaction(
                              emoji
                            );
                          }}
                          disabled={
                            isMutating || !isSettled
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-base transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                          aria-label={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setMenuOpen(
                          (open) => !open
                        )
                      }
                      disabled={
                        isMutating || !isSettled
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                      aria-label="More reactions"
                    >
                      <SmilePlus size={15} />
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => onShare(message)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-white/10"
                  aria-label="Share message"
                >
                  <Share2 size={15} />
                </button>

                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftText(
                        message.text ?? ""
                      );
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-white/10"
                    aria-label="Edit message"
                  >
                    <Pencil size={15} />
                  </button>
                ) : null}

                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      void submitDelete();
                    }}
                    disabled={isMutating}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-red-200 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                    aria-label="Delete message"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            ) : null}

            {menuOpen && !isDeleted ? (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                {["🔥", "👏", "😮", "😢"].map(
                  (emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        void submitReaction(emoji);
                      }}
                      disabled={
                        isMutating || !isSettled
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                      aria-label={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  )
                )}
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-white/65">
              {message.editedAt && !isDeleted ? (
                <span>edited</span>
              ) : null}
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
                      onRetry(message.id)
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-white/20"
                  >
                    <RefreshCw size={11} />
                    Retry
                  </button>
                ) : (
                  <MessageStatus
                    status={message.status}
                  />
                )
              ) : null}
            </div>
          </div>
        </motion.div>
      </Fragment>
    );
  }
);

type ChatConversationProps = {
  onOpenNotifications?: () => void;
  discoverOpen?: boolean;
  activeNowOpen?: boolean;
  onToggleDiscover?: () => void;
  onToggleActiveNow?: () => void;
};

export default function ChatConversation({
  onOpenNotifications,
  discoverOpen,
  activeNowOpen,
  onToggleDiscover,
  onToggleActiveNow,
}: ChatConversationProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [aiOpen, setAiOpen] =
    useState(false);
  const [aiPrompt, setAiPrompt] =
    useState("");
  const [aiResponse, setAiResponse] =
    useState("");
  const [
    isUploadingAttachment,
    setIsUploadingAttachment,
  ] = useState(false);
  const [
    largeVideoFile,
    setLargeVideoFile,
  ] = useState<File | null>(null);
  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);
  const typingActiveRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const hasAnchoredInitialMessagesRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollMeasureFrameRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(
    new Set()
  );
  const reducedMotion = useReducedMotion();
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const unreadNotificationCount =
    useNotificationStore(
      (state) =>
        state.notifications.filter(
          (notification) =>
            !notification.read
        ).length
    );

  const conversationsQuery =
    useConversationsQuery();
  const activeConversationId =
    useConversationStore(
      (state) => state.activeConversationId
    );
  const activeConversationPatch =
    useConversationStore(
      useCallback(
        (state) =>
          activeConversationId
            ? state.conversationPatches[
                activeConversationId
              ]
            : undefined,
        [activeConversationId]
      )
    );
  const activeConversation = useMemo(() => {
    const conversation =
      conversationsQuery.data?.find(
        (item) =>
          item.id === activeConversationId
      ) ?? null;

    if (!conversation) {
      return null;
    }

    return activeConversationPatch
      ? {
          ...conversation,
          ...activeConversationPatch,
        }
      : conversation;
  }, [
    activeConversationId,
    activeConversationPatch,
    conversationsQuery.data,
  ]);
  const conversationId = activeConversationId;
  const messagesQuery = useMessagesQuery(
    conversationId
  );
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = messagesQuery;
  const realtimeMessages = useSocketStore(
    useCallback(
      (state) =>
        conversationId
          ? state.messagesByConversation[
              conversationId
            ] ?? EMPTY_MESSAGES
          : EMPTY_MESSAGES,
      [conversationId]
    )
  );
  const socket = useSocketStore((state) => state.socket);
  const isConnected = useSocketStore(
    (state) => state.isConnected
  );
  const typingUsers = useSocketStore((state) => state.typingUsers);
  const onlineUsers = useSocketStore((state) => state.onlineUsers);
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers),
    [onlineUsers]
  );
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
  const setConnectionError =
    useSocketStore(
      (state) =>
        state.setConnectionError
    );
  const markConversationRead = useConversationStore(
    (state) => state.markConversationRead
  );
  const startCall = useCallStore(
    (state) => state.startCall
  );

  const mergeMutatedMessage =
    useCallback(
      (message: Message) => {
        queryClient.setQueryData<MessageQueryCache>(
          queryKeys.messages.list(
            message.conversationId
          ),
          (cache) =>
            mergeMessageIntoQueryCache(
              cache,
              message
            )
        );
        useSocketStore
          .getState()
          .addMessage(message);
      },
      [queryClient]
    );

  const handleRetryMessage = useCallback(
    (messageId: string) => {
      retryMessage(messageId);
    },
    [retryMessage]
  );

  const handleEditMessage =
    useCallback(
      async (
        message: Message,
        nextText: string
      ) => {
        try {
          const updatedMessage =
            await editMessage({
              messageId: message.id,
              conversationId:
                message.conversationId,
              text: nextText,
            });

          mergeMutatedMessage(
            updatedMessage as Message
          );
          pushToast({
            title: "Message updated",
            variant: "success",
          });

          return true;
        } catch {
          pushToast({
            title: "Edit failed",
            message:
              "That message could not be updated right now.",
            variant: "error",
          });

          return false;
        }
      },
      [
        mergeMutatedMessage,
        pushToast,
      ]
    );

  const handleDeleteMessage =
    useCallback(
      async (message: Message) => {
        try {
          const deletedMessage =
            await deleteMessage({
              messageId: message.id,
              conversationId:
                message.conversationId,
            });

          mergeMutatedMessage(
            deletedMessage as Message
          );
          pushToast({
            title: "Message deleted",
            variant: "success",
          });

          return true;
        } catch {
          pushToast({
            title: "Delete failed",
            message:
              "That message could not be deleted right now.",
            variant: "error",
          });

          return false;
        }
      },
      [
        mergeMutatedMessage,
        pushToast,
      ]
    );

  const handleReactMessage =
    useCallback(
      async (
        message: Message,
        emoji: string
      ) => {
        try {
          const updatedMessage =
            await reactToMessage({
              messageId: message.id,
              conversationId:
                message.conversationId,
              emoji,
            });

          mergeMutatedMessage(
            updatedMessage as Message
          );

          return true;
        } catch {
          pushToast({
            title: "Reaction failed",
            message:
              "We could not sync that reaction.",
            variant: "warning",
          });

          return false;
        }
      },
      [
        mergeMutatedMessage,
        pushToast,
      ]
    );

  const handleShareMessage =
    useCallback(
      (message: Message) => {
        const shareText =
          message.deletedAt
            ? "Message deleted"
            : message.text ||
              message.attachment ||
              message.audio ||
              "";

        if (!shareText) {
          pushToast({
            title: "Nothing to share",
            variant: "info",
          });
          return;
        }

        if (
          navigator.share &&
          shareText.length < 1800
        ) {
          void navigator
            .share({
              text: shareText,
            })
            .catch(() => undefined);
          return;
        }

        void navigator.clipboard
          ?.writeText(shareText)
          .then(() => {
            pushToast({
              title: "Message copied",
              message:
                "Share text is on your clipboard.",
              variant: "success",
            });
          })
          .catch(() => {
            pushToast({
              title: "Share unavailable",
              message:
                "Your browser blocked sharing and clipboard access.",
              variant: "warning",
            });
          });
      },
      [pushToast]
    );

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const resizeComposer =
    useCallback(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(
        textarea.scrollHeight,
        144
      )}px`;
    }, []);

  const stopActiveTyping = useCallback(
    (targetConversationId: string) => {
      clearTypingTimeout();

      if (!typingActiveRef.current) {
        return;
      }

      stopTyping(targetConversationId);
      typingActiveRef.current = false;
    },
    [
      clearTypingTimeout,
      stopTyping,
    ]
  );

  const handleLoadOlderMessages = useCallback(async () => {
    if (
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }

    const element = containerRef.current;
    const previousScrollHeight =
      element?.scrollHeight ?? 0;

    await fetchNextPage();

    requestAnimationFrame(() => {
      const nextElement = containerRef.current;

      if (
        !nextElement ||
        !previousScrollHeight
      ) {
        return;
      }

      nextElement.scrollTop +=
        nextElement.scrollHeight -
        previousScrollHeight;
    });
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  ]);

  const visibleMessages = useMemo(() => {
    if (!conversationId) {
      return [];
    }

    const serverMessages =
      (messagesQuery.data ?? []) as Message[];

    return mergeMessages(
      serverMessages,
      realtimeMessages
    )
      .slice(-RENDER_WINDOW_SIZE);
  }, [
    conversationId,
    realtimeMessages,
    messagesQuery.data,
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
    activeConversation
      ? hasOnlinePeer(
          activeConversation.memberIds,
          onlineUserIds,
          user?.id
        )
      : false;
  const activeUnreadCount =
    activeConversation?.unreadCount ?? 0;
  const showInitialMessageSkeleton =
    messagesQuery.isLoading &&
    !visibleMessages.length;
  const callTargetUserId =
    activeConversation?.memberIds?.find(
      (memberId) =>
        memberId !== user?.id
    );
  const activeConversationAvatar =
    activeConversation
      ? getConversationAvatar(
          activeConversation,
          user?.id
        )
      : null;
  const activeConversationDisplayName =
    formatDisplayName(
      activeConversation?.name ?? "FlexChat"
    );
  const aiSuggestions = useMemo(
    () => [
      "Summarize recent messages",
      "Help me write a warm reply",
      "What media can I send?",
    ],
    []
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    joinConversation(conversationId);

    return () => {
      stopActiveTyping(conversationId);
      leaveConversation(conversationId);
    };
  }, [
    conversationId,
    joinConversation,
    leaveConversation,
    stopActiveTyping,
  ]);

  useEffect(() => {
    if (
      !conversationId ||
      activeUnreadCount <= 0
    ) {
      return;
    }

    markConversationRead(conversationId);
    queryClient.setQueryData<ConversationQueryCache>(
      queryKeys.conversations.all,
      (cache) =>
        updateConversationInQueryCache(
          cache,
          conversationId,
          (conversation) => ({
            ...conversation,
            unreadCount: 0,
          })
        )
    );
  }, [
    activeUnreadCount,
    conversationId,
    markConversationRead,
    queryClient,
  ]);

  useEffect(() => {
    if (!isNearBottomRef.current) {
      return;
    }

    const behavior: ScrollBehavior =
      hasAnchoredInitialMessagesRef.current
        ? "smooth"
        : "auto";

    if (scrollFrameRef.current) {
      cancelAnimationFrame(
        scrollFrameRef.current
      );
    }

    scrollFrameRef.current =
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior,
          block: "end",
        });

        hasAnchoredInitialMessagesRef.current = true;
        scrollFrameRef.current = null;
      });

    return () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(
          scrollFrameRef.current
        );
        scrollFrameRef.current = null;
      }
    };
  }, [
    visibleMessages.length,
    remoteTypingUsers.length,
  ]);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    function handleViewportResize() {
      if (!isNearBottomRef.current) {
        return;
      }

      if (scrollFrameRef.current) {
        cancelAnimationFrame(
          scrollFrameRef.current
        );
      }

      scrollFrameRef.current =
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({
            behavior: "auto",
            block: "end",
          });

          scrollFrameRef.current = null;
        });
    }

    viewport.addEventListener(
      "resize",
      handleViewportResize
    );

    return () => {
      viewport.removeEventListener(
        "resize",
        handleViewportResize
      );
    };
  }, []);

  useEffect(
    () => () => {
      if (scrollMeasureFrameRef.current) {
        cancelAnimationFrame(
          scrollMeasureFrameRef.current
        );
        scrollMeasureFrameRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    resizeComposer();
  }, [
    resizeComposer,
    text,
  ]);

  useEffect(() => {
    if (!conversationId || !user?.id || !isConnected) {
      return;
    }

    const unreadRemoteMessageIds =
      visibleMessages.reduce<string[]>(
        (messageIds, message) => {
          if (
            message.senderId === user.id ||
            message.senderId === "me" ||
            message.status === "read" ||
            seenMessageIdsRef.current.has(message.id)
          ) {
            return messageIds;
          }

          messageIds.push(message.id);
          return messageIds;
        },
        []
      );

    if (!unreadRemoteMessageIds.length) {
      return;
    }

    unreadRemoteMessageIds.forEach((messageId) => {
      if (
        seenMessageIdsRef.current.has(messageId)
      ) {
        return;
      }

      seenMessageIdsRef.current.add(messageId);
    });

    socket.emit(SOCKET_EVENTS.MARK_MESSAGES_SEEN, {
      conversationId,
      messageIds: unreadRemoteMessageIds,
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
    hasAnchoredInitialMessagesRef.current = false;
  }, [conversationId]);

  function handleScroll() {
    if (scrollMeasureFrameRef.current) {
      return;
    }

    scrollMeasureFrameRef.current =
      requestAnimationFrame(() => {
        const element = containerRef.current;

        if (!element) {
          scrollMeasureFrameRef.current = null;
          return;
        }

        isNearBottomRef.current =
          element.scrollHeight -
            element.scrollTop -
            element.clientHeight <
          180;
        scrollMeasureFrameRef.current = null;
      });
  }

  function handleTyping(value: string) {
    setText(value);

    if (!conversationId) {
      return;
    }

    if (!value.trim()) {
      stopActiveTyping(conversationId);
      return;
    }

    if (!typingActiveRef.current) {
      startTyping(conversationId);
      typingActiveRef.current = true;
    }

    clearTypingTimeout();

    typingTimeoutRef.current = setTimeout(() => {
      stopActiveTyping(conversationId);
    }, 900);
  }

  async function handleAttachmentUpload(
    file?: File
  ) {
    if (
      !file ||
      !conversationId ||
      isUploadingAttachment
    ) {
      return;
    }

    if (
      file.type.startsWith("video/") &&
      file.size > MEDIA_LIMITS.video
    ) {
      setLargeVideoFile(file);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    const validationError =
      getUploadValidationError(file);

    if (validationError) {
      pushToast({
        title: "Attachment unavailable",
        message: validationError,
        variant: "warning",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    setIsUploadingAttachment(true);

    try {
      const attachmentUrl =
        await uploadImage(file);
      const caption =
        text.trim();

      sendSocketMessage({
        conversationId,
        text: caption,
        attachment:
          attachmentUrl,
      });

      isNearBottomRef.current = true;
      setText("");
      stopActiveTyping(conversationId);
      setConnectionError(null);
    } catch (error) {
      setConnectionError(
        "Attachment upload failed"
      );
      pushToast({
        title: "Upload failed",
        message:
          error instanceof Error
            ? error.message
            : "We could not attach that file. Please try again.",
        variant: "error",
      });
    } finally {
      setIsUploadingAttachment(false);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }
    }
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

    isNearBottomRef.current = true;
    setText("");
    stopActiveTyping(conversationId);
  }

  function handleAskAi() {
    setAiResponse(
      buildLocalAiResponse({
        prompt: aiPrompt,
        messages: visibleMessages,
        conversationName:
          activeConversationDisplayName,
      })
    );
  }

  function handleStartCall(
    kind: "voice" | "video"
  ) {
    if (
      !conversationId ||
      !callTargetUserId
    ) {
      return;
    }

    void startCall({
      conversationId,
      targetUserId: callTargetUserId,
      kind,
    });
  }

  if (!activeConversation) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-transparent px-6 text-center">
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
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.10),transparent_32%),linear-gradient(180deg,rgba(8,17,31,0.72),rgba(5,8,18,0.92))]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.7)_1px,transparent_0)] [background-size:24px_24px]" />

      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#08111f]/[0.62] px-4 py-4 shadow-lg shadow-black/10 backdrop-blur-2xl sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-base font-bold text-white shadow-lg shadow-purple-950/30 sm:h-14 sm:w-14 sm:text-lg">
            {activeConversationAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeConversationAvatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              getAvatarInitial(
                activeConversation.name
              )
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-semibold text-white">
              {activeConversationDisplayName}
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
                : isConnected
                  ? "Realtime ready"
                  : "Reconnecting..."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleDiscover}
            disabled={!onToggleDiscover}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition hover:border-purple-400/30 hover:bg-purple-500/[0.15] disabled:cursor-not-allowed disabled:opacity-40 ${
              discoverOpen
                ? "border-purple-300/30 bg-purple-500/[0.16] text-purple-100"
                : "border-white/10 bg-white/[0.04] text-zinc-200"
            }`}
            aria-pressed={!!discoverOpen}
            aria-label="Toggle Discover"
          >
            <Compass size={18} />
          </button>

          <button
            type="button"
            onClick={onToggleActiveNow}
            disabled={!onToggleActiveNow}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition hover:border-purple-400/30 hover:bg-purple-500/[0.15] disabled:cursor-not-allowed disabled:opacity-40 ${
              activeNowOpen
                ? "border-cyan-300/30 bg-cyan-500/[0.14] text-cyan-100"
                : "border-white/10 bg-white/[0.04] text-zinc-200"
            }`}
            aria-pressed={!!activeNowOpen}
            aria-label="Toggle Active Now"
          >
            <Users size={18} />
          </button>

          <button
            type="button"
            onClick={onOpenNotifications}
            disabled={!onOpenNotifications}
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:border-purple-400/30 hover:bg-purple-500/[0.15]"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unreadNotificationCount ? (
              <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-red-500/50">
                {unreadNotificationCount > 9
                  ? "9+"
                  : unreadNotificationCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() =>
              handleStartCall("voice")
            }
            disabled={!callTargetUserId}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:border-purple-400/30 hover:bg-purple-500/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Start voice call"
          >
            <Phone size={18} />
          </button>

          <button
            type="button"
            onClick={() =>
              handleStartCall("video")
            }
            disabled={!callTargetUserId}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:border-purple-400/30 hover:bg-purple-500/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Start video call"
          >
            <Video size={18} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="chat-safe-scroll relative z-10 min-h-0 flex-1 touch-pan-y overscroll-contain overflow-y-auto scroll-pb-32 px-3 py-4 sm:px-6 sm:py-6"
      >
        {showInitialMessageSkeleton ? (
          <MessageSkeleton />
        ) : (
          <>
            {messagesQuery.isError ? (
              <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                Unable to load message history
              </div>
            ) : null}

            {hasNextPage ? (
              <div className="mb-5 flex justify-center">
                <button
                  type="button"
                  onClick={
                    handleLoadOlderMessages
                  }
                  disabled={
                    isFetchingNextPage
                  }
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-xl transition hover:border-purple-400/30 hover:bg-purple-500/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {isFetchingNextPage
                    ? "Loading..."
                    : "Load earlier"}
                </button>
              </div>
            ) : null}

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

              return (
                <ChatMessageRow
                  key={message.id}
                  message={message}
                  previous={previous}
                  mine={mine}
                  reducedMotion={
                    !!reducedMotion
                  }
                  onRetry={
                    handleRetryMessage
                  }
                  onEdit={
                    handleEditMessage
                  }
                  onDelete={
                    handleDeleteMessage
                  }
                  onReact={
                    handleReactMessage
                  }
                  onShare={
                    handleShareMessage
                  }
                />
              );
            })}

            {remoteTypingUsers.length ? (
              <div className="mt-4 flex justify-start">
                <div className="rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        animate={
                          reducedMotion
                            ? false
                            : {
                                y: [0, -5, 0],
                                opacity: [
                                  0.4, 1, 0.4,
                                ],
                              }
                        }
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

      <div className="relative z-10 shrink-0 border-t border-white/10 bg-[#08111f]/[0.72] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-5 sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,video/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              void handleAttachmentUpload(
                event.target.files?.[0]
              );
            }}
          />

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={isUploadingAttachment}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
            aria-label="Upload attachment"
          >
            <ImageIcon
              size={20}
              className={
                isUploadingAttachment
                  ? "animate-pulse text-purple-300"
                  : "text-zinc-400"
              }
            />
          </button>

          <button
            type="button"
            onClick={() =>
              setAiOpen(true)
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-500/[0.10] text-purple-100 shadow-lg shadow-purple-950/15 transition-all hover:bg-purple-500/[0.18] active:scale-95"
            aria-label="Open AI assistant"
          >
            <Sparkles size={20} />
          </button>

          <div className="min-w-0 flex-1 rounded-[28px] border border-white/10 bg-white/[0.04] px-4 transition-all duration-200 focus-within:border-purple-400/40 focus-within:bg-white/[0.06] sm:px-5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(event) =>
                handleTyping(
                  event.target.value
                )
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
              onBlur={() => {
                if (conversationId) {
                  stopActiveTyping(
                    conversationId
                  );
                }
              }}
              placeholder="Write a message..."
              className="max-h-36 min-h-[52px] w-full resize-none overflow-y-auto border-0 bg-transparent py-4 text-sm leading-6 text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-0 focus:outline-none focus:ring-0"
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={
              !text.trim() ||
              isUploadingAttachment
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-2xl shadow-purple-600/30 transition-all hover:scale-105 hover:shadow-purple-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizonal size={21} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {largeVideoFile ? (
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
            className="fixed inset-0 z-[275] flex items-end justify-center bg-black/[0.68] p-3 backdrop-blur-xl sm:items-center sm:p-6"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 24,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="w-full max-w-sm rounded-[30px] border border-white/10 bg-[#0B111C]/[0.98] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-500/15 text-purple-100">
                  <Video size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    This video is large.
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    Compress video for faster sending and better compatibility?
                  </p>
                  <p className="mt-3 truncate text-xs text-zinc-500">
                    {largeVideoFile.name}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setLargeVideoFile(null)
                  }
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled
                  className="h-12 rounded-2xl bg-white/[0.08] text-sm font-semibold text-zinc-400"
                  title="Video compression is not available in this build."
                >
                  Compress & Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {aiOpen ? (
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
            className="fixed inset-0 z-[270] flex items-end justify-center bg-black/[0.62] p-3 backdrop-blur-xl sm:items-center sm:p-6"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 24,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 30,
              }}
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#0B111C]/[0.96] text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-600/25">
                    <Sparkles size={19} />
                  </div>
                  <div>
                    <h2 className="font-semibold">
                      FlexChat AI
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Local assistant
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAiOpen(false)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
                  aria-label="Close AI assistant"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-medium text-white">
                    {getTimeAwareGreeting(
                      user?.username
                    )}
                  </p>
                </div>

                <div className="grid gap-2">
                  {aiSuggestions.map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setAiPrompt(
                            suggestion
                          );
                          setAiResponse(
                            buildLocalAiResponse(
                              {
                                prompt:
                                  suggestion,
                                messages:
                                  visibleMessages,
                                conversationName:
                                  activeConversationDisplayName,
                              }
                            )
                          );
                        }}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm text-zinc-200 transition hover:border-purple-300/25 hover:bg-purple-500/10 hover:text-white"
                      >
                        {suggestion}
                      </button>
                    )
                  )}
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(event) =>
                    setAiPrompt(
                      event.target.value.slice(
                        0,
                        600
                      )
                    )
                  }
                  rows={5}
                  placeholder="Ask for a summary, rewrite, or reply idea..."
                  className="w-full resize-none rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-relaxed text-white outline-none transition placeholder:text-zinc-500 focus:border-purple-300/40 focus:bg-white/[0.06]"
                />

                <button
                  type="button"
                  onClick={handleAskAi}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-sm font-semibold text-white shadow-xl shadow-purple-600/25 transition hover:scale-[1.01]"
                >
                  <Sparkles size={18} />
                  Ask AI
                </button>

                {aiResponse ? (
                  <div className="rounded-3xl border border-purple-300/15 bg-purple-500/[0.10] p-4 text-sm leading-relaxed text-purple-50">
                    {aiResponse}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
