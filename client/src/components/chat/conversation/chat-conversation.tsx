"use client";

import {
  Fragment,
  memo,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  Download,
  FileText,
  Forward,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Palette,
  Pencil,
  Phone,
  PlayCircle,
  Reply,
  RefreshCw,
  Search,
  SendHorizonal,
  SmilePlus,
  Sparkles,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { useShallow } from "zustand/react/shallow";

import MessageStatus from "@/components/chat/MessageStatus";
import FlexAvatar from "@/components/chat/flex-avatar";
import { useConversationsQuery } from "@/hooks/queries/use-conversations-query";
import { useMessagesQuery } from "@/hooks/queries/use-messages-query";
import { useAuth } from "@/hooks/useAuth";
import { useServerNow } from "@/hooks/use-server-now";
import {
  deleteMessage,
  editMessage,
  forwardMessage,
  reactToMessage,
} from "@/services/message.service";
import {
  applyConversationTheme,
} from "@/services/conversation.service";
import {
  MEDIA_LIMITS,
  getUploadValidationError,
  uploadImage,
} from "@/services/upload.service";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { Message, useSocketStore } from "@/store/socket-store";
import { useCallStore } from "@/store/call-store";
import { useBlockStore } from "@/store/block-store";
import { useToastStore } from "@/store/toast-store";
import { updateConversationInQueryCache } from "@/lib/conversation-query-cache";
import type { ConversationQueryCache } from "@/lib/conversation-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { getServerNow } from "@/lib/server-time";
import { generateId } from "@/lib/uuid";
import { formatDisplayName } from "@/lib/user-display";
import {
  CHAT_THEMES,
  DEFAULT_CHAT_THEME_ID,
  applyGlobalChatTheme,
  getChatTheme,
  getChatThemeStyle,
} from "@/lib/chat-themes";
import { useConversationStore } from "@/stores/conversation.store";
import {
  mergeMessageIntoQueryCache,
  removeMessagesFromQueryCache,
} from "@/lib/message-query-cache";
import type { MessageQueryCache } from "@/lib/message-query-cache";

const RENDER_WINDOW_SIZE = 360;
const EMPTY_MESSAGES: Message[] = [];
const QUICK_REACTIONS = ["❤️", "👍", "👎", "🔥", "🥰", "👏", "😁"];
const MESSAGE_TIME_FORMATTER = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
});
const DATE_DIVIDER_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});
const DATE_DIVIDER_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DAY_MS = 24 * 60 * 60 * 1000;
const LARGE_FILE_CARD_BYTES = 15 * 1024 * 1024;

function hasOnlinePeer(
  memberIds: string[] | undefined,
  onlineUsers: ReadonlySet<string>,
  currentUserId?: string,
) {
  return (
    memberIds?.some(
      (memberId) => memberId !== currentUserId && onlineUsers.has(memberId),
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
  currentUserId?: string,
) {
  return (
    conversation.avatar ??
    conversation.members?.find(
      (member) => member.id !== currentUserId && member.avatar,
    )?.avatar ??
    null
  );
}

function formatMessageTime(createdAt?: string) {
  if (!createdAt) {
    return "";
  }

  return MESSAGE_TIME_FORMATTER.format(new Date(createdAt));
}

function formatDuration(seconds: number) {
  const safeSeconds =
    Math.max(0, Math.floor(seconds));
  const minutes =
    Math.floor(safeSeconds / 60);
  const remainingSeconds =
    safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getLocalDayStart(time: number) {
  const date = new Date(time);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function formatDateDivider(createdAt?: string, now = Date.now()) {
  if (!createdAt) {
    return "";
  }

  const time = new Date(createdAt).getTime();

  if (Number.isNaN(time)) {
    return "";
  }

  const date = new Date(time);
  const storyDay = getLocalDayStart(time).getTime();
  const today = getLocalDayStart(now).getTime();
  const yesterday = today - DAY_MS;

  if (storyDay === today) {
    return "Today";
  }

  if (storyDay === yesterday) {
    return "Yesterday";
  }

  return (
    date.getFullYear() === new Date(now).getFullYear()
      ? DATE_DIVIDER_FORMATTER
      : DATE_DIVIDER_WITH_YEAR_FORMATTER
  ).format(date);
}

function shouldFocusComposerAfterEmoji() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: fine)").matches;
}

function hideVirtualKeyboard() {
  if (typeof window === "undefined") {
    return;
  }

  const virtualKeyboard = (
    navigator as Navigator & {
      virtualKeyboard?: {
        hide?: () => void;
      };
    }
  ).virtualKeyboard;

  virtualKeyboard?.hide?.();
  window.requestAnimationFrame(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

function formatLastSeen(serverUtcTimestamp?: number | string | null) {
  if (!serverUtcTimestamp) {
    return "Last seen recently";
  }

  const timestamp =
    typeof serverUtcTimestamp === "number"
      ? serverUtcTimestamp
      : new Date(serverUtcTimestamp).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Last seen recently";
  }

  const offset = window.__serverTimeOffset ?? 0;
  const now = Date.now() + offset;
  const diff = now - timestamp;

  if (diff < 60000) {
    return "Last seen just now";
  }

  if (diff < 3600000) {
    return `Last seen ${Math.floor(diff / 60000)}m ago`;
  }

  const d = new Date(timestamp);
  const today = new Date(now);

  if (d.toDateString() === today.toDateString()) {
    return `Last seen today at ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  const yesterday = new Date(now - 86400000);

  if (d.toDateString() === yesterday.toDateString()) {
    return `Last seen yesterday at ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return `Last seen ${d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  })} at ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function isSameMessageDay(left?: string, right?: string) {
  if (!left || !right) {
    return false;
  }

  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return false;
  }

  return (
    getLocalDayStart(leftTime).getTime() ===
    getLocalDayStart(rightTime).getTime()
  );
}

function isImageAttachment(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|heic|heif)(\?|$)/i.test(url);
}

function isVideoAttachment(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v|3gp|3gpp|3g2|3gpp2)(\?|$)/i.test(url);
}

function getAttachmentLabel(url: string) {
  try {
    const parsedUrl = new URL(url);
    const filename = parsedUrl.pathname.split("/").pop();

    return filename ? decodeURIComponent(filename) : "Attachment";
  } catch {
    return "Attachment";
  }
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) {
    return "";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function buildMediaUrl(id: string) {
  const encodedId = encodeURIComponent(id);

  if (typeof window === "undefined") {
    return `/api/media/${encodedId}`;
  }

  return `${window.location.origin}/api/media/${encodedId}`;
}

function getUrlOrMediaUrl(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).toString();
  } catch {
    if (value.startsWith("/")) {
      return typeof window === "undefined"
        ? value
        : `${window.location.origin}${value}`;
    }

    return buildMediaUrl(value);
  }
}

function getMediaFromMessage(message: Message) {
  const typedMediaId = message.mediaId?.trim();

  if (
    (message.type === "image" ||
      message.type === "video" ||
      message.type === "file") &&
    typedMediaId
  ) {
    return {
      type: message.type,
      url: buildMediaUrl(typedMediaId),
      label: message.fileName ?? typedMediaId,
      size: message.fileSize ?? null,
    };
  }

  const textMediaMatch = message.text?.match(
    /^(Photo|Video)\s+(?:-|\u2014)\s+([A-Za-z0-9_.-]+)/i,
  );

  if (textMediaMatch?.[1] && textMediaMatch[2]) {
    const type = textMediaMatch[1].toLowerCase() === "video" ? "video" : "image";

    return {
      type,
      url: buildMediaUrl(textMediaMatch[2]),
      label: textMediaMatch[2],
      size: null,
    } as const;
  }

  if (message.attachment) {
    const url = getUrlOrMediaUrl(message.attachment);

    if (isImageAttachment(url)) {
      return {
        type: "image" as const,
        url,
        label: getAttachmentLabel(url),
        size: message.fileSize ?? null,
      };
    }

    if (isVideoAttachment(url)) {
      return {
        type: "video" as const,
        url,
        label: getAttachmentLabel(url),
        size: message.fileSize ?? null,
      };
    }

    return {
      type: "file" as const,
      url,
      label: message.fileName ?? getAttachmentLabel(url),
      size: message.fileSize ?? null,
    };
  }

  return null;
}

async function downloadWithProgress(
  url: string,
  onProgress: (progress: number) => void,
) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Download failed");
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body?.getReader();

  if (!reader) {
    onProgress(100);
    return response.blob();
  }

  const chunks: BlobPart[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      const chunk = new Uint8Array(value.byteLength);

      chunk.set(value);
      chunks.push(chunk.buffer);
      loaded += value.length;

      if (total) {
        onProgress(Math.min(100, Math.round((loaded / total) * 100)));
      }
    }
  }

  onProgress(100);

  return new Blob(chunks);
}

function saveBlob(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function getMessagePreviewText(message: {
  type?: "text" | "image" | "video" | "file";
  text?: string | null;
  mediaId?: string | null;
  attachment?: string | null;
  audio?: string | null;
  deletedAt?: string | null;
  forwardedFrom?: unknown;
}) {
  let body = "New message";

  if (message.deletedAt) {
    body = "Message deleted";
  } else if (
    message.type === "image" ||
    /^Photo\s+(?:-|\u2014)\s+/i.test(message.text ?? "")
  ) {
    body = "Photo";
  } else if (
    message.type === "video" ||
    /^Video\s+(?:-|\u2014)\s+/i.test(message.text ?? "")
  ) {
    body = "Video";
  } else if (message.type === "file") {
    body = "File";
  } else if (message.text?.trim()) {
    body = message.text.trim();
  } else if (message.audio) {
    body = "Voice message";
  } else if (message.attachment) {
    body = isImageAttachment(message.attachment)
      ? "Photo"
      : isVideoAttachment(message.attachment)
        ? "Video"
        : "File";
  }

  return message.forwardedFrom ? `Forwarded: ${body}` : body;
}

function shouldUseLongPressActions() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function isInteractiveMessageTarget(target: EventTarget | null) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "a,button,input,textarea,select,video,audio,[role='menu'],[data-message-overlay='true']",
    ),
  );
}

function getVoiceRecorderMimeType() {
  if (
    typeof MediaRecorder ===
    "undefined"
  ) {
    return "";
  }

  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ].find((mimeType) =>
    MediaRecorder.isTypeSupported(
      mimeType
    )
  ) ?? "";
}

function sortMessages(messages: Message[]) {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

    return leftTime - rightTime;
  });
}

function mergeMessages(serverMessages: Message[], realtimeMessages: Message[]) {
  const merged: Message[] = [];
  const messageIndexByKey = new Map<string, number>();

  [...serverMessages, ...realtimeMessages].forEach((message) => {
    const messageKeys = [message.id, message.tempId].filter(
      Boolean,
    ) as string[];
    const existingIndex = messageKeys
      .map((key) => messageIndexByKey.get(key))
      .find((index) => index !== undefined);

    if (existingIndex === undefined) {
      merged.push(message);
      messageKeys.forEach((key) => {
        messageIndexByKey.set(key, merged.length - 1);
      });
      return;
    }

    merged[existingIndex] = {
      ...merged[existingIndex],
      ...message,
      optimistic: message.optimistic ?? merged[existingIndex].optimistic,
    };
    [merged[existingIndex].id, merged[existingIndex].tempId]
      .filter(Boolean)
      .forEach((key) => {
        messageIndexByKey.set(key as string, existingIndex);
      });
  });

  return sortMessages(merged);
}

function getTimeAwareGreeting(name?: string | null) {
  const hour = new Date(getServerNow()).getUTCHours();
  const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

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
  const normalizedPrompt = prompt.trim().toLowerCase();
  const recentMessages = messages
    .filter(
      (message) =>
        !message.deletedAt &&
        (message.text?.trim() || message.attachment || message.audio),
    )
    .slice(-12);
  const recentTextMessages = recentMessages
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
    const seed = recentTextMessages.at(-1) ?? prompt.trim();

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
            index % 3 === 0 ? "justify-end" : "justify-start"
          }`}
        >
          <div className="fc-skeleton h-16 w-[min(72%,420px)] animate-pulse rounded-3xl" />
        </div>
      ))}
    </div>
  );
}

type ChatMessageRowProps = {
  message: Message;
  previous?: Message;
  mine: boolean;
  now: number;
  reducedMotion: boolean;
  onRetry: (messageId: string) => void;
  onEdit: (message: Message, text: string) => Promise<boolean>;
  onDelete: (message: Message) => Promise<boolean>;
  onReact: (message: Message, emoji: string) => Promise<boolean>;
  onReply: (message: Message) => void;
  onShare: (message: Message) => void;
};

type ReactionPickerProps = {
  anchorRect: DOMRect;
  disabled: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

type MessageActionOverlayProps = {
  anchorRect: DOMRect;
  mine: boolean;
  disabled: boolean;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ReactionPicker({
  anchorRect,
  disabled,
  onClose,
  onSelect,
}: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (target && pickerRef.current?.contains(target)) {
        return;
      }

      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose]);

  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const gap = 10;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const pickerWidth = Math.min(292, viewportWidth - 24);
  const pickerHeight = 54;
  const left = Math.min(
    Math.max(12, anchorRect.left + anchorRect.width / 2 - pickerWidth / 2),
    viewportWidth - pickerWidth - 12,
  );
  const preferredTop = anchorRect.top - pickerHeight - gap;
  const top =
    preferredTop >= 12
      ? preferredTop
      : Math.min(anchorRect.bottom + gap, viewportHeight - pickerHeight - 12);

  return createPortal(
    <motion.div
      ref={pickerRef}
      data-message-overlay="true"
      initial={{
        opacity: 0,
        y: 6,
        scale: 0.96,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: 6,
        scale: 0.96,
      }}
      transition={{
        duration: 0.15,
      }}
      style={{
        left,
        top,
        width: pickerWidth,
      }}
      className="fc-modal fixed z-[260] flex items-center justify-center gap-1 rounded-2xl border p-2 backdrop-blur-2xl"
      role="menu"
      aria-label="Choose reaction"
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          disabled={disabled}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-white/10 active:scale-90 disabled:cursor-wait disabled:opacity-60"
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </motion.div>,
    document.body,
  );
}

function MessageActionOverlay({
  anchorRect,
  mine,
  disabled,
  canReply,
  canEdit,
  canDelete,
  onClose,
  onReact,
  onReply,
  onShare,
  onEdit,
  onDelete,
}: MessageActionOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const stackWidth = Math.min(286, viewportWidth - 24);
  const actionCount =
    2 + (canReply ? 1 : 0) + (canEdit ? 1 : 0) + (canDelete ? 1 : 0);
  const stackHeight = 56 + 8 + actionCount * 48 + 10;
  const stackLeft = clamp(
    mine ? anchorRect.right - stackWidth : anchorRect.left,
    12,
    viewportWidth - stackWidth - 12,
  );
  const belowTop = anchorRect.bottom + 10;
  const aboveTop = anchorRect.top - stackHeight - 10;
  const stackTop =
    belowTop + stackHeight < viewportHeight - 12
      ? belowTop
      : clamp(aboveTop, 12, viewportHeight - stackHeight - 12);

  const actionButtonClass =
    "fc-telegram-touch flex h-12 w-full items-center gap-4 px-4 text-left text-[15px] font-medium text-white/92 transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-55";

  const content = (
    <AnimatePresence>
      <motion.div
        key="message-action-overlay"
        data-message-overlay="true"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        className="fixed inset-0 z-[255] bg-black/18 backdrop-blur-[2px]"
        onPointerDown={onClose}
      >
        <motion.div
          ref={panelRef}
          initial={{
            opacity: 0,
            y: 6,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: 5,
            scale: 0.98,
          }}
          transition={{
            type: "spring",
            stiffness: 520,
            damping: 38,
            mass: 0.72,
          }}
          style={{
            left: stackLeft,
            top: stackTop,
            width: stackWidth,
          }}
          className="fixed z-[270]"
          onPointerDown={(event) => event.stopPropagation()}
          role="menu"
          aria-label="Message actions"
        >
          <div className="fc-telegram-menu mb-2 flex h-14 items-center justify-between rounded-[21px] border px-2 backdrop-blur-2xl">
            {QUICK_REACTIONS.map((emoji, index) => (
              <motion.button
                key={emoji}
                type="button"
                initial={{
                  opacity: 0,
                  y: 4,
                  scale: 0.86,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 30,
                  delay: index * 0.012,
                }}
                onClick={() => onReact(emoji)}
                disabled={disabled}
                className="fc-telegram-touch flex h-10 w-9 items-center justify-center rounded-full text-[23px] transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-55"
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          <div className="fc-telegram-menu overflow-hidden rounded-[18px] border py-1 backdrop-blur-2xl">
            {canReply ? (
              <button
                type="button"
                onClick={onReply}
                className={actionButtonClass}
              >
                <Reply size={22} />
                Reply
              </button>
            ) : null}

            <button
              type="button"
              onClick={onShare}
              className={actionButtonClass}
            >
              <Forward size={22} />
              Forward
            </button>

            {canEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className={actionButtonClass}
              >
                <Pencil size={22} />
                Edit
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className={actionButtonClass}
            >
              <X size={22} />
              Cancel
            </button>

            {canDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={disabled}
                className={`${actionButtonClass} text-red-100 hover:bg-red-500/15`}
              >
                <Trash2 size={22} />
                Delete
              </button>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

function MessageMediaAttachment({
  url,
  type,
  label,
}: {
  url: string;
  type: "image" | "video";
  label?: string;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerScale, setViewerScale] = useState(1);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);
  const pinchRef = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const mediaLabel = label ?? getAttachmentLabel(url);
  const sizeLabel = formatFileSize(sizeBytes);
  const largeFile = !!sizeBytes && sizeBytes > LARGE_FILE_CARD_BYTES;

  useEffect(() => {
    let disposed = false;

    void fetch(url, {
      method: "HEAD",
    })
      .then((response) => {
        const size = Number(response.headers.get("content-length") ?? 0);

        if (!disposed && Number.isFinite(size) && size > 0) {
          setSizeBytes(size);
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [url]);

  async function handleDownload() {
    if (downloadProgress !== null) {
      return;
    }

    setDownloadProgress(1);

    try {
      const blob = await downloadWithProgress(url, setDownloadProgress);

      saveBlob(blob, mediaLabel);
    } finally {
      window.setTimeout(() => setDownloadProgress(null), 500);
    }
  }

  const preview =
    type === "image" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className="max-h-72 max-w-[280px] cursor-pointer rounded-xl bg-black/25 object-contain"
      />
    ) : (
      <div className="relative bg-black">
        <video
          src={url}
          preload="metadata"
          playsInline
          muted
          className="aspect-video max-h-80 max-w-[280px] cursor-pointer object-contain"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white shadow-2xl">
            <PlayCircle size={28} />
          </span>
        </div>
      </div>
    );

  return (
    <>
      <div className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-black/[0.18]">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="block w-full text-left"
          aria-label={`Open ${type}`}
        >
          {preview}
        </button>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white/85">
              {type === "image" ? "Photo" : "Video"}
              {sizeLabel ? ` - ${sizeLabel}` : ""}
            </p>
            <p className="truncate text-[11px] text-white/45">{mediaLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleDownload();
            }}
            className="relative flex h-9 min-w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.07] px-3 text-xs font-medium text-white transition hover:bg-white/[0.12]"
            aria-label="Download media"
          >
            {downloadProgress === null ? (
              <Download size={15} />
            ) : (
              `${downloadProgress}%`
            )}
          </button>
        </div>

        {largeFile ? (
          <div className="border-t border-white/10 px-3 py-2 text-[11px] text-white/55">
            Large media is downloaded only when you tap download.
          </div>
        ) : null}
      </div>

      {viewerOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[285] flex items-center justify-center bg-black/90 p-3 text-white backdrop-blur-xl"
              onClick={() => {
                setViewerOpen(false);
                setViewerScale(1);
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setViewerOpen(false);
                  setViewerScale(1);
                }}
                className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
                aria-label="Close media viewer"
              >
                <X size={19} />
              </button>

              <div
                className="max-h-full max-w-full overflow-auto"
                onClick={(event) => event.stopPropagation()}
                onTouchStart={(event) => {
                  if (event.touches.length !== 2) {
                    return;
                  }

                  const [first, second] = Array.from(event.touches);
                  pinchRef.current = {
                    distance: Math.hypot(
                      first.clientX - second.clientX,
                      first.clientY - second.clientY,
                    ),
                    scale: viewerScale,
                  };
                }}
                onTouchMove={(event) => {
                  if (event.touches.length !== 2 || !pinchRef.current) {
                    return;
                  }

                  event.preventDefault();
                  const [first, second] = Array.from(event.touches);
                  const distance = Math.hypot(
                    first.clientX - second.clientX,
                    first.clientY - second.clientY,
                  );
                  const nextScale =
                    pinchRef.current.scale * (distance / pinchRef.current.distance);

                  setViewerScale(Math.min(4, Math.max(1, nextScale)));
                }}
                onTouchEnd={() => {
                  pinchRef.current = null;
                }}
              >
                {type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="max-h-[92dvh] max-w-[96vw] select-none object-contain"
                    style={{
                      transform: `scale(${viewerScale})`,
                      transformOrigin: "center",
                      touchAction: "none",
                    }}
                  />
                ) : (
                  <video
                    src={url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[92dvh] max-w-[96vw] bg-black"
                  />
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MessageFileAttachment({
  url,
  label,
  size,
}: {
  url: string;
  label: string;
  size?: number | null;
}) {
  const sizeLabel = formatFileSize(size);

  return (
    <div className="mb-3 flex max-w-[280px] items-center gap-3 rounded-2xl border border-white/10 bg-black/[0.16] p-3 text-white/85">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {sizeLabel ? (
          <p className="mt-0.5 text-xs text-white/50">{sizeLabel}</p>
        ) : null}
      </div>
      <a
        href={url}
        download
        aria-label="Download file"
        className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 px-3 text-xs font-semibold transition hover:bg-white/15"
      >
        <Download size={15} />
      </a>
    </div>
  );
}

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  previous,
  mine,
  now,
  reducedMotion,
  onRetry,
  onEdit,
  onDelete,
  onReact,
  onReply,
  onShare,
}: ChatMessageRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const reactionButtonRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const [reactionAnchorRect, setReactionAnchorRect] = useState<DOMRect | null>(
    null,
  );
  const [actionAnchorRect, setActionAnchorRect] = useState<DOMRect | null>(
    null,
  );
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(message.text ?? "");
  const [isMutating, setIsMutating] = useState(false);
  const [touchActionsEnabled] = useState(() => shouldUseLongPressActions());
  const [swipeX, setSwipeX] = useState(0);
  const [swipeReplyReady, setSwipeReplyReady] = useState(false);
  const [swipingReply, setSwipingReply] = useState(false);
  const swipeRef = useRef<{
    startX: number;
    startY: number;
    mode: "pending" | "reply" | "scroll";
  } | null>(null);
  const grouped =
    previous?.senderId === message.senderId &&
    isSameMessageDay(previous?.createdAt, message.createdAt);
  const showDateDivider =
    !previous || !isSameMessageDay(previous.createdAt, message.createdAt);
  const isDeleted = !!message.deletedAt;
  const isSettled = !message.optimistic && message.status !== "sending";
  const canEdit =
    mine &&
    isSettled &&
    !isDeleted &&
    !message.attachment &&
    !message.audio &&
    !!message.text;
  const canDelete = mine && isSettled && !isDeleted;
  const canReply = isSettled && !isDeleted;
  const media = getMediaFromMessage(message);
  const showLegacyInlineReactionPicker = false;
  const actionsVisible = !!reactionAnchorRect;

  const clearLongPressTimer = useCallback(() => {
    if (!longPressTimerRef.current) {
      return;
    }

    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);

  const closeActions = useCallback(() => {
    clearLongPressTimer();
    setActionsOpen(false);
    setActionAnchorRect(null);
    setReactionAnchorRect(null);
  }, [clearLongPressTimer]);

  const openActions = useCallback(() => {
    const anchor = bubbleRef.current ?? rowRef.current;

    if (!anchor) {
      return;
    }

    navigator.vibrate?.(8);
    setActionAnchorRect(anchor.getBoundingClientRect());
    setReactionAnchorRect(null);
    setActionsOpen(true);
  }, []);

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
      closeActions();
    }
  }

  async function submitDelete() {
    setIsMutating(true);
    const ok = await onDelete(message);
    setIsMutating(false);

    if (ok) {
      closeActions();
    }
  }

  async function submitReaction(emoji: string) {
    setIsMutating(true);
    const ok = await onReact(message, emoji);
    setIsMutating(false);

    if (ok) {
      closeActions();
    }
  }

  function toggleReactionPicker() {
    const anchor = reactionButtonRef.current;

    if (!anchor || !isSettled || isDeleted) {
      return;
    }

    setActionsOpen(false);
    setActionAnchorRect(null);
    setReactionAnchorRect((current) =>
      current ? null : anchor.getBoundingClientRect(),
    );
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.pointerType === "mouse" ||
      isEditing ||
      isInteractiveMessageTarget(event.target)
    ) {
      return;
    }

    pressStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      openActions();
      longPressTimerRef.current = null;
    }, 330);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pressStart = pressStartRef.current;

    if (!pressStart) {
      return;
    }

    if (
      Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) >
      10
    ) {
      pressStartRef.current = null;
      clearLongPressTimer();
    }
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    clearLongPressTimer();
    openActions();
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (!touchActionsEnabled || !canReply || isEditing) {
      return;
    }

    const touch = event.touches[0];

    if (!touch || isInteractiveMessageTarget(event.target)) {
      return;
    }

    swipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      mode: "pending",
    };
    setSwipingReply(false);
    setSwipeReplyReady(false);
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    const touch = event.touches[0];

    if (!swipe || !touch) {
      return;
    }

    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;

    if (swipe.mode === "pending") {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
        return;
      }

      const horizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.35;

      swipe.mode = horizontal && deltaX > 0 ? "reply" : "scroll";
    }

    if (swipe.mode !== "reply") {
      return;
    }

    event.preventDefault();
    clearLongPressTimer();

    const nextX = Math.min(Math.max(deltaX, 0), 60);

    setSwipingReply(true);
    setSwipeX(nextX);
    setSwipeReplyReady(nextX >= 40);
  }

  function handleTouchEnd() {
    const shouldReply = swipeReplyReady;

    swipeRef.current = null;
    setSwipingReply(false);
    setSwipeReplyReady(false);
    setSwipeX(0);

    if (shouldReply) {
      closeActions();
      onReply(message);
    }
  }

  useEffect(() => {
    if (!actionsOpen && !reactionAnchorRect) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (target && rowRef.current?.contains(target)) {
        return;
      }

      if (
        typeof HTMLElement !== "undefined" &&
        event.target instanceof HTMLElement &&
        event.target.closest("[data-message-overlay='true']")
      ) {
        return;
      }

      closeActions();
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [actionsOpen, closeActions, reactionAnchorRect]);

  useEffect(
    () => () => {
      pressStartRef.current = null;
      clearLongPressTimer();
    },
    [clearLongPressTimer],
  );

  return (
    <Fragment>
      {showDateDivider ? (
        <div className="my-2.5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--fc-divider)]" />
          <span className="fc-surface rounded-full border px-3 py-0.5 text-[11px] font-medium text-[var(--fc-text-muted)] backdrop-blur-xl">
            {formatDateDivider(message.createdAt, now)}
          </span>
          <div className="h-px flex-1 bg-[var(--fc-divider)]" />
        </div>
      ) : null}

      <motion.div
        ref={rowRef}
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
          scale: actionsOpen ? 1.012 : 1,
          x: swipeX,
        }}
        whileTap={
          reducedMotion || isEditing || actionsOpen
            ? undefined
            : {
                scale: 0.996,
                transition: {
                  duration: 0.08,
                },
              }
        }
        transition={
          swipingReply
            ? { duration: 0 }
            : {
                duration: reducedMotion ? 0 : 0.16,
                ease: [0.22, 1, 0.36, 1],
              }
        }
        className={`fc-telegram-touch flex ${grouped ? "mt-[3px]" : "mt-2"} ${
          mine ? "justify-end" : "justify-start"
        } group/message relative ${actionsOpen ? "z-[266]" : "z-0"} [transition:transform_0.2s_cubic-bezier(0.22,1,0.36,1)]`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
        }}
        onPointerCancel={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
        }}
        onPointerLeave={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
        }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {canReply ? (
          <div
            className={`fc-button-soft pointer-events-none absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition-opacity ${
              mine ? "right-[calc(100%-2.25rem)]" : "left-0"
            } ${swipeX >= 40 ? "opacity-100" : "opacity-0"}`}
          >
            <Reply size={15} />
          </div>
        ) : null}

        <div
          ref={bubbleRef}
          style={
            !isDeleted
              ? {
                  background: mine
                    ? "var(--fc-own-bubble)"
                    : "var(--fc-their-bubble)",
                  color: mine
                    ? "var(--fc-own-bubble-text)"
                    : "var(--fc-their-bubble-text)",
                }
              : undefined
          }
          className={`fc-message-bubble relative max-w-[86%] rounded-[17px] px-3.5 py-[7px] text-[15px] text-white sm:max-w-[68%] sm:px-4 sm:py-2 ${
            mine
              ? "rounded-br-[6px]"
              : "rounded-bl-[6px] border border-[var(--fc-app-border)]"
          } ${message.status === "failed" ? "ring-1 ring-red-400/35" : ""} ${
            isDeleted
              ? "border border-[var(--fc-app-border)] bg-[var(--fc-app-surface)] text-[var(--fc-text-muted)]"
              : ""
          }`}
        >
          {message.replyTo ? (
            <div className="mb-3 rounded-2xl border border-[var(--fc-app-border)] bg-[var(--fc-input-bg)] px-3 py-2 text-xs text-[var(--fc-text-muted)]">
              <p className="font-medium text-[var(--fc-theme-text)]">Reply</p>
              <p className="mt-1 line-clamp-2">{message.replyTo.text}</p>
            </div>
          ) : null}

          {message.forwardedFrom && !isDeleted ? (
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
              <Forward size={12} />
              <span className="truncate">
                Forwarded
                {message.forwardedFrom.senderName
                  ? ` from ${formatDisplayName(
                      message.forwardedFrom.senderName,
                    )}`
                  : ""}
              </span>
            </div>
          ) : null}

          {isDeleted ? (
            <p className="italic text-white/65">Message deleted</p>
          ) : null}

          {!isDeleted && media ? (
            media.type === "image" ? (
              <MessageMediaAttachment
                url={media.url}
                type="image"
                label={media.label}
              />
            ) : media.type === "video" ? (
              <MessageMediaAttachment
                url={media.url}
                type="video"
                label={media.label}
              />
            ) : (
              <MessageFileAttachment
                url={media.url}
                label={media.label}
                size={media.size}
              />
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
                  setDraftText(event.target.value.slice(0, 4000))
                }
                autoFocus
                rows={3}
                className="fc-input w-full resize-none rounded-2xl border px-3 py-2 text-sm leading-relaxed outline-none transition"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftText(message.text ?? "");
                    setIsEditing(false);
                  }}
                  disabled={isMutating}
                  className="fc-surface fc-hover flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-wait disabled:opacity-60"
                  aria-label="Cancel edit"
                >
                  <X size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void submitEdit();
                  }}
                  disabled={isMutating || !draftText.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--fc-primary)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Save edit"
                >
                  <Check size={15} />
                </button>
              </div>
            </div>
          ) : !isDeleted && message.text && !media ? (
            <p className="whitespace-pre-wrap break-words leading-[1.36]">
              {message.text}
            </p>
          ) : null}

          {!isDeleted && message.reactions?.length ? (
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {message.reactions.map((reaction) => (
                <span
                  key={reaction.emoji}
                  className="rounded-full border border-[var(--fc-app-border)] bg-[var(--fc-input-bg)] px-2 py-1 text-xs shadow-sm"
                >
                  {reaction.emoji} {reaction.count}
                </span>
              ))}
            </div>
          ) : null}

          {!isEditing && !actionsOpen ? (
            <div
              className={`fc-modal absolute top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-[18px] border p-1 shadow-[0_14px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl transition max-sm:bottom-full max-sm:left-auto max-sm:right-0 max-sm:top-auto max-sm:mb-2 max-sm:translate-y-0 ${
                mine ? "right-full mr-2" : "left-full ml-2"
              } ${
                actionsVisible
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0 [@media(hover:hover)]:group-hover/message:pointer-events-auto [@media(hover:hover)]:group-hover/message:opacity-100 [@media(hover:hover)]:group-focus-within/message:pointer-events-auto [@media(hover:hover)]:group-focus-within/message:opacity-100"
              }`}
            >
              {!isDeleted ? (
                <>
                  {["👍", "❤️", "😂"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        void submitReaction(emoji);
                      }}
                      disabled={isMutating || !isSettled}
                      className="hidden h-8 w-8 items-center justify-center rounded-xl text-base transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                      aria-label={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}

                  <button
                    ref={reactionButtonRef}
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onClick={toggleReactionPicker}
                    disabled={isMutating || !isSettled}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-white/10 active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
                    reactionAnchorRect ? "bg-white/10 text-[#9BD0FF]" : ""
                    }`}
                    aria-expanded={!!reactionAnchorRect}
                    aria-label="Add reaction"
                  >
                    <SmilePlus size={15} />
                  </button>
                </>
              ) : null}

              {canReply ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    setReactionAnchorRect(null);
                    onReply(message);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-white/10"
                  aria-label="Reply to message"
                >
                  <Reply size={15} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  onShare(message);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-white/10"
                aria-label="Forward message"
              >
                <Forward size={15} />
              </button>

              {canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftText(message.text ?? "");
                    setIsEditing(true);
                    setReactionAnchorRect(null);
                    setActionsOpen(false);
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
                    setActionsOpen(false);
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

          {actionsOpen && actionAnchorRect && !isEditing ? (
            <MessageActionOverlay
              anchorRect={actionAnchorRect}
              mine={mine}
              disabled={isMutating || !isSettled}
              canReply={canReply}
              canEdit={canEdit}
              canDelete={canDelete}
              onClose={closeActions}
              onReact={(emoji) => {
                void submitReaction(emoji);
              }}
              onReply={() => {
                closeActions();
                onReply(message);
              }}
              onShare={() => {
                closeActions();
                onShare(message);
              }}
              onEdit={() => {
                setDraftText(message.text ?? "");
                setIsEditing(true);
                closeActions();
              }}
              onDelete={() => {
                void submitDelete();
              }}
            />
          ) : null}

          {showLegacyInlineReactionPicker &&
          reactionAnchorRect &&
          !isDeleted ? (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
              {["🔥", "👏", "😮", "😢"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    void submitReaction(emoji);
                  }}
                  disabled={isMutating || !isSettled}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}

          <AnimatePresence>
            {reactionAnchorRect && !isDeleted ? (
              <ReactionPicker
                anchorRect={reactionAnchorRect}
                disabled={isMutating || !isSettled}
                onClose={() => setReactionAnchorRect(null)}
                onSelect={(emoji) => {
                  void submitReaction(emoji);
                }}
              />
            ) : null}
          </AnimatePresence>

          <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] font-medium leading-none text-white/62">
            {message.editedAt && !isDeleted ? <span>edited</span> : null}
            <span>{formatMessageTime(message.createdAt)}</span>

            {mine ? (
              message.status === "failed" ? (
                <button
                  type="button"
                  onClick={() => onRetry(message.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-white/20"
                >
                  <RefreshCw size={11} />
                  Retry
                </button>
              ) : (
                <MessageStatus status={message.status} />
              )
            ) : null}
          </div>
        </div>
      </motion.div>
    </Fragment>
  );
});

type FailedAttachmentUpload = {
  file: File;
  message: string;
};

export default function ChatConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(
    null,
  );
  const [forwardSearch, setForwardSearch] = useState("");
  const [selectedForwardConversationIds, setSelectedForwardConversationIds] =
    useState<Set<string>>(() => new Set());
  const [isForwarding, setIsForwarding] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [themeApplying, setThemeApplying] = useState<{
    themeId: string | null;
    scope: "me" | "both";
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePictureOpen, setProfilePictureOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [largeVideoFile, setLargeVideoFile] = useState<File | null>(null);
  const [failedAttachmentUpload, setFailedAttachmentUpload] =
    useState<FailedAttachmentUpload | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingPointerStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const recordingShouldCancelRef = useRef(false);
  const recordingPointerActiveRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const typingActiveRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const hasAnchoredInitialMessagesRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollMeasureFrameRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const reducedMotion = useReducedMotion();
  const now = useServerNow();
  const pushToast = useToastStore((state) => state.pushToast);
  const blockedConversationIds = useBlockStore(
    (state) => state.blockedConversationIds,
  );
  const blockEvents = useBlockStore((state) => state.blockEvents);
  const blockConversation = useBlockStore((state) => state.blockConversation);
  const unblockConversation = useBlockStore(
    (state) => state.unblockConversation,
  );

  const conversationsQuery = useConversationsQuery();
  const activeConversationId = useConversationStore(
    (state) => state.activeConversationId,
  );
  const activeConversationPatch = useConversationStore(
    useCallback(
      (state) =>
        activeConversationId
          ? state.conversationPatches[activeConversationId]
          : undefined,
      [activeConversationId],
    ),
  );
  const activeConversation = useMemo(() => {
    const conversation =
      conversationsQuery.data?.find(
        (item) => item.id === activeConversationId,
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
  }, [activeConversationId, activeConversationPatch, conversationsQuery.data]);
  const conversationId = activeConversationId;
  const messagesQuery = useMessagesQuery(conversationId);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = messagesQuery;
  const realtimeMessages = useSocketStore(
    useCallback(
      (state) =>
        conversationId
          ? (state.messagesByConversation[conversationId] ?? EMPTY_MESSAGES)
          : EMPTY_MESSAGES,
      [conversationId],
    ),
  );
  const socket = useSocketStore((state) => state.socket);
  const isConnected = useSocketStore((state) => state.isConnected);
  const typingUsers = useSocketStore(
    useShallow((state) => state.typingUsers),
  );
  const onlineUsers = useSocketStore(
    useShallow((state) => state.onlineUsers),
  );
  const onlineUserIds = useMemo(() => new Set(onlineUsers), [onlineUsers]);
  const joinConversation = useSocketStore((state) => state.joinConversation);
  const leaveConversation = useSocketStore((state) => state.leaveConversation);
  const sendSocketMessage = useSocketStore((state) => state.sendMessage);
  const startTyping = useSocketStore((state) => state.startTyping);
  const stopTyping = useSocketStore((state) => state.stopTyping);
  const retryMessage = useSocketStore((state) => state.retryMessage);
  const setConnectionError = useSocketStore(
    (state) => state.setConnectionError,
  );
  const markConversationRead = useConversationStore(
    (state) => state.markConversationRead,
  );
  const updateConversationMessage = useConversationStore(
    (state) => state.updateConversationMessage,
  );
  const startCall = useCallStore((state) => state.startCall);

  const mergeMutatedMessage = useCallback(
    (message: Message) => {
      queryClient.setQueryData<MessageQueryCache>(
        queryKeys.messages.list(message.conversationId),
        (cache) => mergeMessageIntoQueryCache(cache, message),
      );
      useSocketStore.getState().addMessage(message);
    },
    [queryClient],
  );

  const handleRetryMessage = useCallback(
    (messageId: string) => {
      retryMessage(messageId);
    },
    [retryMessage],
  );

  const handleEditMessage = useCallback(
    async (message: Message, nextText: string) => {
      try {
        const updatedMessage = await editMessage({
          messageId: message.id,
          conversationId: message.conversationId,
          text: nextText,
        });

        mergeMutatedMessage(updatedMessage as Message);
        pushToast({
          title: "Message updated",
          variant: "success",
        });

        return true;
      } catch {
        pushToast({
          title: "Edit failed",
          message: "That message could not be updated right now.",
          variant: "error",
        });

        return false;
      }
    },
    [mergeMutatedMessage, pushToast],
  );

  const handleDeleteMessage = useCallback(
    async (message: Message) => {
      try {
        const deletedMessage = await deleteMessage({
          messageId: message.id,
          conversationId: message.conversationId,
        });

        mergeMutatedMessage(deletedMessage as Message);
        pushToast({
          title: "Message deleted",
          variant: "success",
        });

        return true;
      } catch {
        pushToast({
          title: "Delete failed",
          message: "That message could not be deleted right now.",
          variant: "error",
        });

        return false;
      }
    },
    [mergeMutatedMessage, pushToast],
  );

  const handleReactMessage = useCallback(
    async (message: Message, emoji: string) => {
      try {
        const updatedMessage = await reactToMessage({
          messageId: message.id,
          conversationId: message.conversationId,
          emoji,
        });

        mergeMutatedMessage(updatedMessage as Message);

        return true;
      } catch {
        pushToast({
          title: "Reaction failed",
          message: "We could not sync that reaction.",
          variant: "warning",
        });

        return false;
      }
    },
    [mergeMutatedMessage, pushToast],
  );

  const handleReplyMessage = useCallback(
    (message: Message) => {
      if (message.deletedAt) {
        return;
      }

      setReplyingTo(message);
      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    },
    [],
  );

  const handleShareMessage = useCallback(
    (message: Message) => {
      if (message.deletedAt) {
        pushToast({
          title: "Deleted messages can't be forwarded",
          variant: "info",
        });
        return;
      }

      setForwardingMessage(message);
      setForwardSearch("");
      setSelectedForwardConversationIds(new Set());
    },
    [pushToast],
  );

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const resizeComposer = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
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
    [clearTypingTimeout, stopTyping],
  );

  const handleLoadOlderMessages = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const element = containerRef.current;
    const previousScrollHeight = element?.scrollHeight ?? 0;

    await fetchNextPage();

    requestAnimationFrame(() => {
      const nextElement = containerRef.current;

      if (!nextElement || !previousScrollHeight) {
        return;
      }

      nextElement.scrollTop += nextElement.scrollHeight - previousScrollHeight;
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const visibleMessages = useMemo(() => {
    if (!conversationId) {
      return [];
    }

    const serverMessages = (messagesQuery.data ?? []) as Message[];

    return mergeMessages(serverMessages, realtimeMessages).slice(
      -RENDER_WINDOW_SIZE,
    );
  }, [conversationId, realtimeMessages, messagesQuery.data]);

  const remoteTypingUsers = useMemo(
    () => typingUsers.filter((typingUserId) => typingUserId !== user?.id),
    [typingUsers, user?.id],
  );

  const isOnline = activeConversation
    ? hasOnlinePeer(activeConversation.memberIds, onlineUserIds, user?.id)
    : false;
  const activeUnreadCount = activeConversation?.unreadCount ?? 0;
  const showInitialMessageSkeleton =
    messagesQuery.isLoading && !visibleMessages.length;
  const callTargetUserId = activeConversation?.memberIds?.find(
    (memberId) => memberId !== user?.id,
  );
  const activeConversationAvatar = activeConversation
    ? getConversationAvatar(activeConversation, user?.id)
    : null;
  const activeConversationDisplayName = formatDisplayName(
    activeConversation?.name ?? "FlexChat",
  );
  const isConversationBlocked =
    !!conversationId && blockedConversationIds.includes(conversationId);
  const blockEvent =
    conversationId ? blockEvents[conversationId] : undefined;
  const profileMembers =
    activeConversation?.members ?? [];
  const remoteMember =
    activeConversation?.members?.find(
      (member) => member.id !== user?.id
    ) ?? null;
  const presenceLabel =
    isConversationBlocked
      ? "Profile hidden"
      : remoteTypingUsers.length
        ? "Typing..."
        : isOnline
          ? "Online"
          : formatLastSeen(remoteMember?.lastSeenAt);
  const activeTheme = getChatTheme(
    activeConversation?.localThemeId ??
      activeConversation?.sharedThemeId ??
      DEFAULT_CHAT_THEME_ID,
  );
  const activeThemeStyle =
    getChatThemeStyle(activeTheme);

  useEffect(() => {
    applyGlobalChatTheme(activeTheme.id);
    window.dispatchEvent(
      new CustomEvent("flexchat:theme-changed", {
        detail: {
          themeId: activeTheme.id,
        },
      }),
    );
  }, [activeTheme.id]);

  useEffect(() => {
    function handleOpenConversationProfile(event: Event) {
      const detail =
        (event as CustomEvent<{
          conversationId?: string;
        }>).detail ?? {};
      const currentConversationId =
        useConversationStore.getState()
          .activeConversationId;

      if (
        useBlockStore
          .getState()
          .isConversationBlocked(currentConversationId)
      ) {
        return;
      }

      if (
        detail.conversationId &&
        currentConversationId &&
        detail.conversationId !==
          currentConversationId
      ) {
        return;
      }

      setProfileOpen(true);
    }

    window.addEventListener(
      "flexchat:open-conversation-profile",
      handleOpenConversationProfile,
    );

    return () => {
      window.removeEventListener(
        "flexchat:open-conversation-profile",
        handleOpenConversationProfile,
      );
    };
  }, []);

  const headerActionClass =
    "fc-telegram-touch fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)] disabled:cursor-not-allowed disabled:opacity-40";
  const headerIconSize = 18;
  const aiSuggestions = useMemo(
    () => [
      "Summarize recent messages",
      "Help me write a warm reply",
      "What media can I send?",
    ],
    [],
  );
  const forwardConversations = useMemo(() => {
    const normalizedSearch = forwardSearch.trim().toLowerCase();

    return (conversationsQuery.data ?? [])
      .filter((conversation) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          conversation.name?.toLowerCase().includes(normalizedSearch) ?? false
        );
      })
      .slice(0, 60);
  }, [conversationsQuery.data, forwardSearch]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    joinConversation(conversationId);

    return () => {
      stopActiveTyping(conversationId);
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, stopActiveTyping]);

  useEffect(() => {
    if (!conversationId || activeUnreadCount <= 0) {
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
          }),
        ),
    );
  }, [activeUnreadCount, conversationId, markConversationRead, queryClient]);

  useEffect(() => {
    if (!isNearBottomRef.current) {
      return;
    }

    const behavior: ScrollBehavior = hasAnchoredInitialMessagesRef.current
      ? "smooth"
      : "auto";

    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });

      hasAnchoredInitialMessagesRef.current = true;
      scrollFrameRef.current = null;
    });

    return () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [visibleMessages.length, remoteTypingUsers.length]);

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
        cancelAnimationFrame(scrollFrameRef.current);
      }

      scrollFrameRef.current = requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "auto",
          block: "end",
        });

        scrollFrameRef.current = null;
      });
    }

    viewport.addEventListener("resize", handleViewportResize);

    return () => {
      viewport.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  useEffect(
    () => () => {
      if (scrollMeasureFrameRef.current) {
        cancelAnimationFrame(scrollMeasureFrameRef.current);
        scrollMeasureFrameRef.current = null;
      }
    },
    [],
  );

  useEffect(
    () => () => {
      stopRecordingTimer();
      stopRecordingStream();

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    },
    [],
  );

  useEffect(() => {
    resizeComposer();
  }, [resizeComposer, text]);

  useEffect(() => {
    if (!conversationId || !user?.id || !isConnected || !socket) {
      return;
    }

    const unreadRemoteMessageIds = visibleMessages.reduce<string[]>(
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
      [],
    );

    if (!unreadRemoteMessageIds.length) {
      return;
    }

    unreadRemoteMessageIds.forEach((messageId) => {
      if (seenMessageIdsRef.current.has(messageId)) {
        return;
      }

      seenMessageIdsRef.current.add(messageId);
    });

    socket.emit(SOCKET_EVENTS.MARK_MESSAGES_SEEN, {
      conversationId,
      messageIds: unreadRemoteMessageIds,
    });
  }, [conversationId, isConnected, socket, user?.id, visibleMessages]);

  useEffect(() => {
    seenMessageIdsRef.current.clear();
    hasAnchoredInitialMessagesRef.current = false;

    const frameId = window.requestAnimationFrame(() => {
      setReplyingTo(null);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [conversationId]);

  function handleScroll() {
    if (scrollMeasureFrameRef.current) {
      return;
    }

    scrollMeasureFrameRef.current = requestAnimationFrame(() => {
      const element = containerRef.current;

      if (!element) {
        scrollMeasureFrameRef.current = null;
        return;
      }

      isNearBottomRef.current =
        element.scrollHeight - element.scrollTop - element.clientHeight < 180;
      scrollMeasureFrameRef.current = null;
    });
  }

  function handleTyping(value: string) {
    if (isConversationBlocked) {
      setText("");

      if (conversationId) {
        stopActiveTyping(conversationId);
      }

      return;
    }

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
    }, 760);
  }

  function handleEmojiSelect(emoji: EmojiClickData) {
    const nextText = `${text}${emoji.emoji}`.slice(0, 4000);

    handleTyping(nextText);

    if (shouldFocusComposerAfterEmoji()) {
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }

  function toggleEmojiPanel() {
    if (isConversationBlocked) {
      return;
    }

    setEmojiOpen((open) => {
      const nextOpen = !open;

      if (nextOpen) {
        hideVirtualKeyboard();
      } else if (shouldFocusComposerAfterEmoji()) {
        window.requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }

      return nextOpen;
    });
  }

  function stopRecordingTimer() {
    if (!recordingTimerRef.current) {
      return;
    }

    clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  }

  function stopRecordingStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    recordingStreamRef.current = null;
  }

  async function uploadVoiceNote(blob: Blob) {
    if (!conversationId) {
      return;
    }

    if (isConversationBlocked) {
      showBlockedInteractionToast();
      return;
    }

    const extension =
      blob.type.includes("ogg") ? "ogg" : "webm";
    const audioMimeType =
      extension === "ogg"
        ? "audio/ogg"
        : "audio/webm";
    const file = new File(
      [blob],
      `voice-note-${Date.now()}.${extension}`,
      {
        type: audioMimeType,
      },
    );

    setIsUploadingAttachment(true);
    setAttachmentUploadProgress(4);

    try {
      const audioUrl = await uploadImage(file, {
        onProgress: (progress) => {
          setAttachmentUploadProgress(Math.min(96, Math.max(6, progress)));
        },
      });

      sendSocketMessage({
        conversationId,
        text: "",
        audio: audioUrl,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              text: getMessagePreviewText(replyingTo),
            }
          : undefined,
      });

      isNearBottomRef.current = true;
      setReplyingTo(null);
      setConnectionError(null);
      setAttachmentUploadProgress(100);
    } catch (error) {
      setConnectionError("Voice note upload failed");
      pushToast({
        title: "Voice note failed",
        message:
          error instanceof Error
            ? error.message
            : "We could not send that voice note.",
        variant: "error",
      });
    } finally {
      setIsUploadingAttachment(false);
      window.setTimeout(() => {
        setAttachmentUploadProgress(0);
      }, 350);
    }
  }

  async function finishVoiceRecording(shouldSend: boolean) {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    const startedAt = recordingStartedAtRef.current;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();

      if (recorder.state !== "inactive") {
        recorder.stop();
        return;
      }

      resolve();
    });

    stopRecordingTimer();
    stopRecordingStream();
    mediaRecorderRef.current = null;
    setIsRecordingVoice(false);
    setRecordingSeconds(0);

    const durationMs = Date.now() - startedAt;
    const chunks = recordingChunksRef.current;
    recordingChunksRef.current = [];

    if (!shouldSend || durationMs < 650 || !chunks.length) {
      return;
    }

    const blob = new Blob(chunks, {
      type: recorder.mimeType || "audio/webm",
    });

    await uploadVoiceNote(blob);
  }

  async function startVoiceRecording() {
    if (
      !conversationId ||
      isUploadingAttachment ||
      isRecordingVoice
    ) {
      return;
    }

    if (isConversationBlocked) {
      showBlockedInteractionToast();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      pushToast({
        title: "Voice recording unavailable",
        message: "This browser cannot record voice notes.",
        variant: "warning",
      });
      return;
    }

    const mimeType =
      getVoiceRecorderMimeType();

    if (!mimeType) {
      pushToast({
        title: "Voice notes unavailable",
        message: "This browser cannot encode voice notes.",
        variant: "warning",
      });
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      if (!recordingPointerActiveRef.current) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }

      const recorder =
        new MediaRecorder(stream, {
          mimeType,
        });

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      stopRecordingTimer();
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(
          Math.floor(
            (Date.now() - recordingStartedAtRef.current) / 1000,
          ),
        );
      }, 250);
    } catch (error) {
      stopRecordingStream();
      pushToast({
        title: "Permission needed",
        message:
          error instanceof Error
            ? "Please allow microphone/camera in browser settings"
            : "Please allow microphone/camera in browser settings",
        variant: "error",
      });
    }
  }

  async function handleAttachmentUpload(file?: File) {
    if (!file || !conversationId || isUploadingAttachment) {
      return;
    }

    if (isConversationBlocked) {
      showBlockedInteractionToast();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (
      file.type.startsWith("video/") &&
      file.size > MEDIA_LIMITS.videoInput
    ) {
      setLargeVideoFile(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    const validationError = getUploadValidationError(file);

    if (validationError) {
      pushToast({
        title: "Attachment unavailable",
        message: validationError,
        variant: "warning",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setIsUploadingAttachment(true);
    setAttachmentUploadProgress(4);
    setFailedAttachmentUpload(null);

    try {
      const attachmentUrl = await uploadImage(file, {
        onProgress: (progress) => {
          setAttachmentUploadProgress(Math.min(96, Math.max(6, progress)));
        },
      });
      const caption = text.trim();

      sendSocketMessage({
        conversationId,
        text: caption,
        attachment: attachmentUrl,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              text: getMessagePreviewText(replyingTo),
            }
          : undefined,
      });

      isNearBottomRef.current = true;
      setText("");
      setReplyingTo(null);
      stopActiveTyping(conversationId);
      setConnectionError(null);
      setAttachmentUploadProgress(100);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We could not attach that file. Please try again.";

      setConnectionError("Attachment upload failed");
      setFailedAttachmentUpload({
        file,
        message,
      });
      pushToast({
        title: "Upload failed",
        message,
        variant: "error",
      });
    } finally {
      setIsUploadingAttachment(false);
      window.setTimeout(() => {
        setAttachmentUploadProgress(0);
      }, 350);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleSend() {
    if (!conversationId) {
      return;
    }

    if (isConversationBlocked) {
      showBlockedInteractionToast();
      return;
    }

    const nextText = text.trim();

    if (!nextText) {
      return;
    }

    sendSocketMessage({
      conversationId,
      text: nextText,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            text: getMessagePreviewText(replyingTo),
          }
        : undefined,
    });

    isNearBottomRef.current = true;
    setText("");
    setReplyingTo(null);
    stopActiveTyping(conversationId);
  }

  function handleAskAi() {
    setAiResponse(
      buildLocalAiResponse({
        prompt: aiPrompt,
        messages: visibleMessages,
        conversationName: activeConversationDisplayName,
      }),
    );
  }

  function handleToggleBlock() {
    if (!conversationId) {
      return;
    }

    if (isConversationBlocked) {
      unblockConversation(conversationId, activeConversationDisplayName);
      pushToast({
        title: `${activeConversationDisplayName} unblocked`,
        message: "You can message this chat again.",
        variant: "info",
      });
    } else {
      blockConversation(conversationId, activeConversationDisplayName);
      setReplyingTo(null);
      setText("");
      setProfileOpen(false);
      setProfilePictureOpen(false);
      setEmojiOpen(false);
      stopActiveTyping(conversationId);
      pushToast({
        title: `${activeConversationDisplayName} blocked`,
        message: "Messages and calls are paused for this chat.",
        variant: "info",
      });
    }

    setChatSettingsOpen(false);
  }

  function showBlockedInteractionToast() {
    pushToast({
      title: `You have blocked ${activeConversationDisplayName}`,
      message: "Unblock this chat to send messages or start calls.",
      variant: "info",
    });
  }

  function returnToConversationList() {
    closeForwardSheet();
    setEmojiOpen(false);
    setProfileOpen(false);
    setProfilePictureOpen(false);
    useConversationStore.setState({
      activeConversationId: null,
    });
    window.dispatchEvent(new CustomEvent("flexchat:open-mobile-sidebar"));
  }

  async function handleApplyTheme(
    themeId: string | null,
    scope: "me" | "both",
  ) {
    if (!conversationId) {
      return;
    }

    setThemeApplying({
      themeId,
      scope,
    });

    const optimisticTheme = getChatTheme(themeId);
    applyGlobalChatTheme(optimisticTheme.id);
    window.dispatchEvent(
      new CustomEvent("flexchat:theme-changed", {
        detail: {
          themeId: optimisticTheme.id,
        },
      }),
    );

    try {
      const conversation = await applyConversationTheme({
        conversationId,
        themeId,
        scope,
      });

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          updateConversationInQueryCache(
            cache,
            conversation.id,
            () => conversation,
          ),
      );

      useConversationStore.setState((state) => ({
        conversationPatches: {
          ...state.conversationPatches,
          [conversation.id]: {
            ...state.conversationPatches[conversation.id],
            localThemeId: conversation.localThemeId ?? null,
            sharedThemeId: conversation.sharedThemeId ?? null,
            themeUpdatedAt: conversation.themeUpdatedAt ?? null,
          },
        },
      }));

      setThemeSheetOpen(false);
      setChatSettingsOpen(false);
      pushToast({
        title: "Theme updated",
        message:
          scope === "both"
            ? "This chat theme was synced for both people."
            : "This chat theme is only visible to you.",
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Theme unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Please try changing the theme again.",
        variant: "error",
      });
      applyGlobalChatTheme(activeTheme.id);
      window.dispatchEvent(
        new CustomEvent("flexchat:theme-changed", {
          detail: {
            themeId: activeTheme.id,
          },
        }),
      );
    } finally {
      setThemeApplying(null);
    }
  }

  function handleStartCall(kind: "voice" | "video") {
    if (!conversationId || !callTargetUserId) {
      return;
    }

    if (isConversationBlocked) {
      showBlockedInteractionToast();
      return;
    }

    void startCall({
      conversationId,
      targetUserId: callTargetUserId,
      kind,
    });
  }

  function closeForwardSheet() {
    if (isForwarding) {
      return;
    }

    setForwardingMessage(null);
    setSelectedForwardConversationIds(new Set());
    setForwardSearch("");
  }

  function toggleForwardTarget(conversationId: string) {
    setSelectedForwardConversationIds((current) => {
      const next = new Set(current);

      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }

      return next;
    });
  }

  function removeOptimisticForwardMessages(messageIds: string[]) {
    if (!messageIds.length) {
      return;
    }

    const ids = new Set(messageIds);

    queryClient.setQueriesData<MessageQueryCache>(
      {
        queryKey: ["messages"],
      },
      (cache) => removeMessagesFromQueryCache(cache, messageIds),
    );

    useSocketStore.setState((state) => {
      const filterMessages = (messages: Message[]) =>
        messages.filter(
          (message) =>
            !ids.has(message.id) &&
            !(message.tempId && ids.has(message.tempId)),
        );
      const nextBuckets: Record<string, Message[]> = {};

      Object.entries(state.messagesByConversation).forEach(
        ([conversationId, messages]) => {
          nextBuckets[conversationId] = filterMessages(messages);
        },
      );

      return {
        messages: filterMessages(state.messages),
        messagesByConversation: nextBuckets,
      };
    });
  }

  async function handleForwardSubmit() {
    if (!forwardingMessage || isForwarding || !user?.id) {
      return;
    }

    const targetConversationIds = Array.from(selectedForwardConversationIds);

    if (!targetConversationIds.length) {
      pushToast({
        title: "Choose a conversation",
        message: "Select where this message should be forwarded.",
        variant: "info",
      });
      return;
    }

    const optimisticIds: string[] = [];
    const forwardedAt = new Date(getServerNow()).toISOString();
    const sourceAttribution = forwardingMessage.forwardedFrom ?? {
      messageId: forwardingMessage.id,
      senderId: forwardingMessage.senderId,
      senderName:
        forwardingMessage.senderId === user.id
          ? user.username
          : activeConversationDisplayName,
    };

    setIsForwarding(true);

    targetConversationIds.forEach((targetConversationId) => {
      const optimisticId = generateId();
      optimisticIds.push(optimisticId);

      const optimisticMessage: Message = {
        ...forwardingMessage,
        id: optimisticId,
        tempId: optimisticId,
        conversationId: targetConversationId,
        senderId: user.id,
        createdAt: forwardedAt,
        status: "sending",
        optimistic: true,
        reactions: [],
        forwardedFrom: sourceAttribution,
      };

      mergeMutatedMessage(optimisticMessage);

      const latestMessage = getMessagePreviewText(optimisticMessage);

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) =>
          updateConversationInQueryCache(
            cache,
            targetConversationId,
            (conversation) => ({
              ...conversation,
              latestMessage,
              lastActivityAt: forwardedAt,
            }),
          ),
      );

      updateConversationMessage(targetConversationId, latestMessage);
    });

    try {
      const forwardedMessages = await forwardMessage({
        messageId: forwardingMessage.id,
        targetConversationIds,
      });

      removeOptimisticForwardMessages(optimisticIds);

      forwardedMessages.forEach((message) => {
        mergeMutatedMessage(message as Message);
      });

      pushToast({
        title: "Message forwarded",
        message:
          targetConversationIds.length > 1
            ? "Forwarded to selected conversations."
            : "Forwarded to the selected conversation.",
        variant: "success",
      });

      setForwardingMessage(null);
      setSelectedForwardConversationIds(new Set());
      setForwardSearch("");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    } catch (error) {
      removeOptimisticForwardMessages(optimisticIds);
      pushToast({
        title: "Forward failed",
        message:
          error instanceof Error
            ? error.message
            : "Please try forwarding that message again.",
        variant: "error",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    } finally {
      setIsForwarding(false);
    }
  }

  if (!activeConversation) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-transparent px-6 text-center">
        <div className="fc-surface-strong max-w-sm rounded-2xl border p-8 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-[var(--fc-theme-text)]">
            Select a conversation
          </h2>
          <p className="fc-muted mt-2 text-sm">
            Your realtime messages will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      style={activeThemeStyle}
      className="fc-chat-doodle relative flex h-full min-h-0 flex-col overflow-hidden text-[var(--fc-theme-text)]"
    >
      <div
        className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--fc-app-border)] bg-[var(--fc-chat-header)] px-2.5 py-2.5 pt-[calc(0.45rem+env(safe-area-inset-top))] shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-2xl sm:px-5 sm:py-3.5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={returnToConversationList}
            className="fc-telegram-touch fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fc-theme-text)] transition lg:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft size={24} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isConversationBlocked) {
                showBlockedInteractionToast();
                return;
              }

              setProfileOpen(true);
            }}
            className="shrink-0 rounded-2xl outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConversationBlocked}
            aria-label="Open profile"
          >
            <FlexAvatar
              src={activeConversationAvatar}
              name={activeConversation.name}
              className="fc-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold sm:h-11 sm:w-11 sm:text-base"
            />
          </button>

          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-[19px] font-semibold leading-tight text-[var(--fc-theme-text)]"
            >
              {activeConversationDisplayName}
            </h2>

            <p
              className={`truncate text-[13px] leading-tight ${
                isConversationBlocked
                  ? "text-[var(--fc-text-subtle)]"
                  : remoteTypingUsers.length
                  ? "text-cyan-300"
                  : isOnline
                    ? "text-[var(--fc-success)]"
                    : "text-[var(--fc-text-subtle)]"
              }`}
            >
              {isConnected ? presenceLabel : "Reconnecting..."}
            </p>
          </div>
        </div>

        <div
          className="flex max-w-[58vw] shrink-0 items-center gap-2 overflow-x-auto pl-1 sm:max-w-none sm:overflow-visible sm:pl-0"
        >
          <button
            type="button"
            onClick={() => handleStartCall("voice")}
            disabled={!callTargetUserId || isConversationBlocked}
            className={headerActionClass}
            aria-label="Start voice call"
          >
            <Phone size={headerIconSize} />
          </button>

          <button
            type="button"
            onClick={() => handleStartCall("video")}
            disabled={!callTargetUserId || isConversationBlocked}
            className={headerActionClass}
            aria-label="Start video call"
          >
            <Video size={headerIconSize} />
          </button>

          <button
            type="button"
            onClick={() =>
              setChatSettingsOpen(true)
            }
            className={headerActionClass}
            aria-label="Open chat settings"
          >
            <MoreVertical size={headerIconSize} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="chat-safe-scroll relative z-10 min-h-0 flex-1 touch-pan-y overscroll-contain overflow-y-auto scroll-pb-28 px-2.5 py-3 sm:px-5 sm:py-5"
      >
        {showInitialMessageSkeleton ? (
          <MessageSkeleton />
        ) : (
          <>
            {messagesQuery.isError ? (
              <button
                type="button"
                onClick={() => {
                  void messagesQuery.refetch();
                }}
                className="mb-5 w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                Something went wrong. Tap to retry.
              </button>
            ) : null}

            {hasNextPage ? (
              <div className="mb-5 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadOlderMessages}
                  disabled={isFetchingNextPage}
                  className="fc-surface fc-hover rounded-full border px-4 py-2 text-xs font-medium text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)] disabled:cursor-wait disabled:opacity-60"
                >
                  {isFetchingNextPage ? "Loading..." : "Load earlier"}
                </button>
              </div>
            ) : null}

            {activeConversation.unreadCount ? (
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[rgba(var(--fc-primary-rgb),0.3)]" />
                <span className="fc-button-soft rounded-full border px-3 py-1 text-xs">
                  Unread messages
                </span>
                <div className="h-px flex-1 bg-[rgba(var(--fc-primary-rgb),0.3)]" />
              </div>
            ) : null}

            {blockEvent ? (
              <div className="mb-5 flex justify-center">
                <div className="fc-button-soft inline-flex max-w-[min(92%,34rem)] items-center gap-2 rounded-full border px-3 py-2 text-xs text-[var(--fc-text-muted)]">
                  <Ban
                    size={13}
                    className={
                      blockEvent.blocked
                        ? "text-red-200"
                        : "text-[var(--fc-accent-text)]"
                    }
                  />
                  <span className="truncate">{blockEvent.message}</span>
                </div>
              </div>
            ) : null}

            {!messagesQuery.isLoading &&
            !messagesQuery.isError &&
            !visibleMessages.length ? (
              <div className="flex min-h-[45vh] items-center justify-center px-6 text-center">
                <div>
                  <MessageCircle className="mx-auto text-[var(--fc-text-subtle)]" size={34} />
                  <p className="mt-3 text-sm font-medium text-[var(--fc-text-muted)]">
                    No messages yet
                  </p>
                  <p className="fc-subtle mt-1 text-xs">
                    Send the first message to start this chat.
                  </p>
                </div>
              </div>
            ) : null}

            {visibleMessages.map((message, index) => {
              const mine =
                message.senderId === user?.id || message.senderId === "me";
              const previous = visibleMessages[index - 1];

              return (
                <ChatMessageRow
                  key={message.id}
                  message={message}
                  previous={previous}
                  mine={mine}
                  now={now}
                  reducedMotion={!!reducedMotion}
                  onRetry={handleRetryMessage}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onReact={handleReactMessage}
                  onReply={handleReplyMessage}
                  onShare={handleShareMessage}
                />
              );
            })}

            {remoteTypingUsers.length ? (
              <div className="mt-4 flex justify-start">
                <div className="rounded-[20px] rounded-bl-md border border-[var(--fc-app-border)] bg-[var(--fc-their-bubble)] px-4 py-3">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        animate={
                          reducedMotion
                            ? false
                            : {
                                y: [0, -5, 0],
                                opacity: [0.4, 1, 0.4],
                              }
                        }
                        transition={{
                          duration: 0.72,
                          repeat: Infinity,
                          delay: dot * 0.13,
                        }}
                        className="h-2 w-2 rounded-full bg-[var(--fc-accent-text)]"
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

      <div
        className="relative z-10 shrink-0 border-t border-[var(--fc-app-border)] bg-[var(--fc-chat-composer)] px-2.5 py-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] backdrop-blur-2xl sm:px-5 sm:py-2.5 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        {replyingTo ? (
          <div className="fc-button-soft mb-2 flex items-center gap-3 rounded-2xl border p-3 text-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--fc-app-border)] bg-[var(--fc-input-bg)]">
              <Reply size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-[var(--fc-accent-text)]">
                Replying
              </p>
              <p className="truncate text-xs text-[var(--fc-text-muted)]">
                {getMessagePreviewText(replyingTo)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="fc-surface fc-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition"
              aria-label="Cancel reply"
            >
              <X size={15} />
            </button>
          </div>
        ) : null}

        {failedAttachmentUpload ? (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.08] p-3 text-sm text-red-100">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--fc-app-border)] bg-[var(--fc-input-bg)]">
              <AlertCircle size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-medium">Upload failed</p>
              <p className="truncate text-xs text-red-100/70">
                {failedAttachmentUpload.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const failed =
                  failedAttachmentUpload;

                setFailedAttachmentUpload(null);
                void handleAttachmentUpload(
                  failed.file
                );
              }}
              disabled={isUploadingAttachment || isConversationBlocked}
              className="fc-surface fc-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-wait disabled:opacity-60"
              aria-label="Retry attachment upload"
            >
              <RefreshCw size={15} />
            </button>

            <button
              type="button"
              onClick={() =>
                setFailedAttachmentUpload(null)
              }
              className="fc-surface fc-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition"
              aria-label="Dismiss upload error"
            >
              <X size={15} />
            </button>
          </div>
        ) : null}

        <div className="relative flex items-end gap-2 sm:gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,video/*,application/pdf"
            className="hidden"
            disabled={isConversationBlocked}
            onChange={(event) => {
              void handleAttachmentUpload(event.target.files?.[0]);
            }}
          />

          <div
            className={`fc-composer relative min-w-0 flex-1 rounded-[23px] border border-white/[0.035] bg-[#1d2b38]/95 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors duration-200 ${
              isConversationBlocked ? "opacity-75" : ""
            }`}
          >
            <div className="flex items-end gap-1">
              <button
                type="button"
                onClick={toggleEmojiPanel}
                disabled={isConversationBlocked}
                className={`fc-telegram-touch fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:text-[var(--fc-theme-text)] ${
                  emojiOpen
                    ? "bg-[var(--fc-app-surface-active)] text-[var(--fc-accent-text)]"
                    : "text-[var(--fc-text-subtle)]"
                }`}
                aria-label={emojiOpen ? "Close emoji picker" : "Open emoji picker"}
                aria-expanded={emojiOpen}
              >
                <SmilePlus size={20} />
              </button>

              <div className="min-w-0 flex-1">
                {isRecordingVoice ? (
                  <div className="flex min-h-[40px] items-center gap-3 py-1 sm:min-h-[44px]">
                    <button
                      type="button"
                      onPointerDown={(event) =>
                        event.stopPropagation()
                      }
                      onClick={() => {
                        void finishVoiceRecording(false);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-300/20 bg-red-500/15 text-red-100"
                      aria-label="Cancel voice note"
                    >
                      <X size={15} />
                    </button>

                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      {Array.from({
                        length: 18,
                      }).map((_, index) => (
                        <motion.span
                          key={index}
                          animate={{
                            height: [
                              8,
                              18 + ((index % 5) * 3),
                              8,
                            ],
                            opacity: [0.4, 1, 0.4],
                          }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            delay: index * 0.035,
                          }}
                          className="w-1 rounded-full bg-[var(--fc-accent-text)]"
                        />
                      ))}
                    </div>

                    <span className="shrink-0 text-xs font-medium text-[var(--fc-accent-text)]">
                      {formatDuration(recordingSeconds)}
                    </span>
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    onChange={(event) => handleTyping(event.target.value)}
                    onFocus={() => setEmojiOpen(false)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    onBlur={() => {
                      if (conversationId) {
                        stopActiveTyping(conversationId);
                      }
                    }}
                    placeholder={
                      isConversationBlocked
                        ? `You have blocked ${activeConversationDisplayName}`
                        : "Write a message..."
                    }
                    disabled={isConversationBlocked}
                    className="max-h-32 min-h-[38px] w-full resize-none overflow-y-auto border-0 bg-transparent py-2.5 text-[16px] leading-5 text-[var(--fc-theme-text)] shadow-none outline-none ring-0 placeholder:text-[var(--fc-text-subtle)] focus:border-0 focus:outline-none focus:ring-0 focus-visible:shadow-none disabled:cursor-not-allowed sm:min-h-[40px] sm:py-2.5"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment || isConversationBlocked}
                className="fc-telegram-touch fc-hover relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[var(--fc-text-subtle)] transition hover:text-[var(--fc-theme-text)] disabled:cursor-wait disabled:opacity-70"
                aria-label="Upload attachment"
              >
                <Paperclip
                  size={20}
                  className={
                    isUploadingAttachment
                      ? "animate-pulse text-[var(--fc-accent-text)]"
                      : undefined
                  }
                />
                {isUploadingAttachment ? (
                  <span className="absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/15">
                    <span
                      className="block h-full rounded-full bg-[var(--fc-accent-text)] transition-[width]"
                      style={{
                        width: `${attachmentUploadProgress}%`,
                      }}
                    />
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={text.trim() ? handleSend : undefined}
                onPointerDown={
                  text.trim()
                    ? undefined
                    : (event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        recordingPointerActiveRef.current = true;
                        recordingPointerStartRef.current = {
                          x: event.clientX,
                          y: event.clientY,
                        };
                        recordingShouldCancelRef.current = false;
                        void startVoiceRecording();
                      }
                }
                onPointerMove={
                  text.trim()
                    ? undefined
                    : (event) => {
                        const start = recordingPointerStartRef.current;

                        if (!start) {
                          return;
                        }

                        const horizontalDelta = event.clientX - start.x;
                        const verticalDelta = event.clientY - start.y;

                        recordingShouldCancelRef.current =
                          horizontalDelta < -52 || Math.abs(verticalDelta) > 88;
                      }
                }
                onPointerUp={
                  text.trim()
                    ? undefined
                    : (event) => {
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }

                        const shouldSend = !recordingShouldCancelRef.current;

                        recordingPointerActiveRef.current = false;
                        recordingPointerStartRef.current = null;
                        recordingShouldCancelRef.current = false;
                        void finishVoiceRecording(shouldSend);
                      }
                }
                onPointerCancel={
                  text.trim()
                    ? undefined
                    : () => {
                        recordingPointerActiveRef.current = false;
                        recordingPointerStartRef.current = null;
                        recordingShouldCancelRef.current = false;
                        void finishVoiceRecording(false);
                      }
                }
                onContextMenu={(event) => event.preventDefault()}
                disabled={
                  !conversationId ||
                  isUploadingAttachment ||
                  isConversationBlocked ||
                  (!!text.trim() && isRecordingVoice)
                }
                className={`fc-telegram-touch flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45 ${
                  text.trim()
                    ? "fc-button-primary"
                  : isRecordingVoice
                      ? "bg-red-500"
                      : "bg-[var(--fc-app-surface-hover)] hover:bg-[var(--fc-app-surface-active)]"
                }`}
                aria-label={
                  text.trim() ? "Send message" : "Hold to record voice note"
                }
              >
                {text.trim() ? <SendHorizonal size={19} /> : <Mic size={19} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {emojiOpen ? (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "min(316px, 42dvh)",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration: reducedMotion ? 0 : 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-2 overflow-hidden rounded-[22px] border fc-emoji-panel shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
            >
              <EmojiPicker
                theme={
                  activeTheme.mode === "light"
                    ? Theme.LIGHT
                    : Theme.DARK
                }
                emojiStyle={EmojiStyle.NATIVE}
                lazyLoadEmojis
                width="100%"
                height={320}
                previewConfig={{
                  showPreview: false,
                }}
                searchDisabled={false}
                onEmojiClick={handleEmojiSelect}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {chatSettingsOpen ? (
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
            className="fixed inset-0 z-[268] flex items-end justify-center bg-[var(--fc-overlay)] p-3 backdrop-blur-xl sm:items-center sm:p-6"
            onClick={() =>
              setChatSettingsOpen(false)
            }
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
                stiffness: 340,
                damping: 34,
              }}
              className="fc-modal w-full max-w-sm overflow-hidden rounded-[24px] border"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] p-5">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    Chat Settings
                  </h2>
                  <p className="fc-subtle mt-1 truncate text-xs">
                    {activeConversationDisplayName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setChatSettingsOpen(false)
                  }
                  className="fc-surface fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition"
                  aria-label="Close chat settings"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid gap-2 p-3">
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className="fc-hover flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-[var(--fc-theme-text)] transition"
                >
                  <Ban
                    size={18}
                    className={
                      isConversationBlocked
                        ? "text-red-200"
                        : "text-[var(--fc-accent-text)]"
                    }
                  />
                  {isConversationBlocked
                    ? `Unblock ${activeConversationDisplayName}`
                    : `Block ${activeConversationDisplayName}`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setThemeSheetOpen(true);
                    setChatSettingsOpen(false);
                  }}
                  className="fc-hover flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-[var(--fc-theme-text)] transition"
                >
                  <Palette
                    size={18}
                    className="text-[var(--fc-accent-text)]"
                  />
                  Change Theme
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {themeSheetOpen ? (
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
            className="fixed inset-0 z-[269] flex items-end justify-center bg-[var(--fc-overlay)] p-3 backdrop-blur-xl sm:items-center sm:p-6"
            onClick={() =>
              setThemeSheetOpen(false)
            }
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
                stiffness: 340,
                damping: 34,
              }}
              className="fc-modal flex max-h-[min(86dvh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] px-5 py-4">
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    Change Theme
                  </h2>
                  <p className="fc-subtle truncate text-xs">
                    {activeTheme.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setThemeSheetOpen(false)
                  }
                  className="fc-surface fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition"
                  aria-label="Close theme picker"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="chat-safe-scroll min-h-0 flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CHAT_THEMES.map((theme) => {
                    const selected =
                      theme.id === activeTheme.id;
                    const applyingForMe =
                      themeApplying?.themeId ===
                        theme.id &&
                      themeApplying.scope === "me";
                    const applyingForBoth =
                      themeApplying?.themeId ===
                        theme.id &&
                      themeApplying.scope === "both";

                    return (
                      <div
                        key={theme.id}
                        className={`overflow-hidden rounded-2xl border p-3 ${
                          selected
                            ? "fc-active"
                            : "fc-surface"
                        }`}
                      >
                        <div
                          className="h-20 rounded-xl border border-[var(--fc-app-border)]"
                          style={{
                            background:
                              theme.background,
                          }}
                        >
                          <div className="flex h-full items-end gap-2 p-3">
                            <span
                              className="h-8 flex-1 rounded-2xl"
                              style={{
                                background:
                                  theme.theirBubble,
                              }}
                            />
                            <span
                              className="h-10 flex-1 rounded-2xl"
                              style={{
                                background:
                                  theme.ownBubble,
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium">
                            {theme.name}
                          </p>
                          <span className="fc-surface rounded-full border px-2 py-1 text-[10px] uppercase text-[var(--fc-text-muted)]">
                            {theme.mode}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void handleApplyTheme(
                                theme.id,
                                "me"
                              );
                            }}
                            disabled={!!themeApplying}
                            className="fc-surface fc-hover flex h-10 items-center justify-center rounded-xl border text-xs font-medium text-[var(--fc-theme-text)] transition disabled:cursor-wait disabled:opacity-60"
                          >
                            {applyingForMe
                              ? "Applying"
                              : "Apply For Me"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void handleApplyTheme(
                                theme.id,
                                "both"
                              );
                            }}
                            disabled={!!themeApplying}
                            className="flex h-10 items-center justify-center rounded-xl border border-[rgba(var(--fc-primary-rgb),0.22)] bg-[rgba(var(--fc-primary-rgb),0.10)] text-xs font-semibold text-[var(--fc-theme-text)] transition hover:bg-[rgba(var(--fc-primary-rgb),0.16)] disabled:cursor-wait disabled:opacity-60"
                          >
                            {applyingForBoth
                              ? "Applying"
                              : "Apply For Both"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen && !isConversationBlocked ? (
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
            className="fixed inset-0 z-[274] flex items-end justify-center bg-[var(--fc-overlay)] p-3 backdrop-blur-xl sm:items-center sm:p-6"
            onClick={() => setProfileOpen(false)}
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 26,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 26,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 34,
              }}
              className="fc-modal flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative shrink-0 border-b border-[var(--fc-app-border)] bg-[var(--fc-app-panel-strong)] px-6 pb-7 pt-7 text-center">
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  className="fc-surface absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border backdrop-blur-xl"
                  aria-label="Close profile"
                >
                  <X size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setProfilePictureOpen(true)}
                  className="fc-avatar mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[var(--fc-app-border-strong)] text-4xl font-bold"
                  aria-label="View profile picture"
                >
                  <FlexAvatar
                    src={activeConversationAvatar}
                    name={activeConversationDisplayName}
                    className="fc-avatar flex h-full w-full items-center justify-center overflow-hidden rounded-full text-4xl font-bold"
                  />
                </button>

                <h2 className="mt-5 text-2xl font-bold">
                  {activeConversationDisplayName}
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  {isConnected ? presenceLabel : "Reconnecting"}
                </p>
              </div>

              <div className="modal-safe-scroll min-h-0 flex-1 space-y-3 p-5">
                  <div className="fc-surface flex items-center gap-3 rounded-2xl border p-4">
                  <div className="fc-button-soft flex h-11 w-11 items-center justify-center rounded-2xl border">
                    <UserRound size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="fc-subtle text-xs">
                      Profile
                    </p>
                    <p className="truncate text-sm font-medium text-[var(--fc-theme-text)]">
                      {activeConversation.type === "direct"
                        ? "Direct conversation"
                        : `${profileMembers.length} members`}
                    </p>
                  </div>
                </div>

                {profileMembers.length ? (
                  <div className="fc-surface rounded-2xl border p-3">
                    <p className="fc-subtle mb-2 px-1 text-xs font-medium">
                      Members
                    </p>
                    <div className="space-y-2">
                      {profileMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 rounded-xl px-1 py-2"
                        >
                          <FlexAvatar
                            src={member.avatar}
                            name={member.username}
                            className="fc-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
                          />
                          <p className="truncate text-sm text-[var(--fc-theme-text)]">
                            {formatDisplayName(member.username)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {profilePictureOpen && !isConversationBlocked ? (
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
            className="fixed inset-0 z-[276] flex items-center justify-center bg-[var(--fc-overlay-strong)] p-5 backdrop-blur-xl"
            onClick={() => setProfilePictureOpen(false)}
          >
            <button
              type="button"
              className="fc-surface absolute right-5 top-[calc(1rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-2xl border"
              onClick={() => setProfilePictureOpen(false)}
              aria-label="Close profile picture"
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{
                scale: 0.92,
              }}
              animate={{
                scale: 1,
              }}
              exit={{
                scale: 0.92,
              }}
              className="fc-avatar flex aspect-square w-full max-w-[min(82vw,420px)] items-center justify-center overflow-hidden rounded-full text-6xl font-bold shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <FlexAvatar
                src={activeConversationAvatar}
                name={activeConversationDisplayName}
                className="fc-avatar flex h-full w-full items-center justify-center overflow-hidden rounded-full text-6xl font-bold"
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {forwardingMessage ? (
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
            className="fixed inset-0 z-[272] flex items-end justify-center bg-[var(--fc-overlay)] p-3 backdrop-blur-xl sm:items-center sm:p-6"
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
                stiffness: 340,
                damping: 34,
              }}
              className="fc-modal flex max-h-[min(82dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-[24px] border"
            >
              <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] px-5 py-4">
                <div className="min-w-0">
                  <h2 className="font-semibold">Forward message</h2>
                  <p className="fc-subtle truncate text-xs">
                    {getMessagePreviewText(forwardingMessage)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForwardSheet}
                  disabled={isForwarding}
                  className="fc-surface fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-wait disabled:opacity-60"
                  aria-label="Close forward dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="border-b border-[var(--fc-app-border)] p-4">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fc-text-subtle)]"
                  />
                  <input
                    value={forwardSearch}
                    onChange={(event) => setForwardSearch(event.target.value)}
                    placeholder="Search conversations..."
                    className="fc-input h-11 w-full rounded-2xl border pl-11 pr-4 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="chat-safe-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {forwardConversations.length ? (
                  forwardConversations.map((conversation) => {
                    const selected = selectedForwardConversationIds.has(
                      conversation.id,
                    );
                    const avatar = getConversationAvatar(
                      conversation,
                      user?.id,
                    );
                    const displayName = formatDisplayName(conversation.name);

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => toggleForwardTarget(conversation.id)}
                        disabled={isForwarding}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "fc-active"
                            : "fc-surface hover:bg-[var(--fc-app-surface-hover)]"
                        } disabled:cursor-wait disabled:opacity-70`}
                      >
                        <FlexAvatar
                          src={avatar}
                          name={displayName}
                          className="fc-brand-gradient flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-bold text-white"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--fc-theme-text)]">
                            {displayName}
                          </p>
                          <p className="fc-subtle truncate text-xs">
                            {conversation.latestMessage ?? "No messages yet"}
                          </p>
                        </div>

                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                            selected
                              ? "border-[rgba(var(--fc-primary-rgb),0.4)] bg-[var(--fc-primary)] text-white"
                              : "border-[var(--fc-app-border)] bg-[var(--fc-app-surface)] text-transparent"
                          }`}
                        >
                          <Check size={14} />
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="fc-subtle flex min-h-32 items-center justify-center px-4 text-center text-sm">
                    No conversations found
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 border-t border-[var(--fc-app-border)] p-4">
                <button
                  type="button"
                  onClick={closeForwardSheet}
                  disabled={isForwarding}
                  className="fc-surface fc-hover h-11 flex-1 rounded-2xl border text-sm font-medium text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)] disabled:cursor-wait disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleForwardSubmit();
                  }}
                  disabled={
                    isForwarding || !selectedForwardConversationIds.size
                  }
                  className="fc-button-primary flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isForwarding ? (
                    <RefreshCw size={16} className="motion-safe:animate-spin" />
                  ) : (
                    <Forward size={16} />
                  )}
                  Forward
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
            className="fixed inset-0 z-[275] flex items-end justify-center bg-[var(--fc-overlay)] p-3 backdrop-blur-xl sm:items-center sm:p-6"
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
                stiffness: 340,
                damping: 34,
              }}
              className="fc-modal w-full max-w-sm rounded-[24px] border p-5"
            >
              <div className="flex items-start gap-4">
                <div className="fc-button-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border">
                  <Video size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    This video is large.
                  </h2>
                  <p className="fc-muted mt-1 text-sm leading-relaxed">
                    Compress video for faster sending and better compatibility?
                  </p>
                  <p className="fc-subtle mt-3 truncate text-xs">
                    {largeVideoFile.name}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLargeVideoFile(null)}
                  className="fc-surface fc-hover h-12 rounded-2xl border text-sm font-medium text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLargeVideoFile(null);
                    fileInputRef.current?.click();
                  }}
                  className="fc-button-primary h-12 rounded-2xl text-sm font-semibold transition hover:scale-[1.01]"
                >
                  Choose another
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
            className="fixed inset-0 z-[270] flex items-end justify-center bg-[var(--fc-overlay)] p-3 backdrop-blur-xl sm:items-center sm:p-6"
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
                damping: 34,
              }}
              className="fc-modal w-full max-w-md overflow-hidden rounded-[24px] border backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--fc-app-border)] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="fc-brand-gradient flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg">
                    <Sparkles size={19} />
                  </div>
                  <div>
                    <h2 className="font-semibold">FlexChat AI</h2>
                    <p className="fc-subtle text-xs">Local assistant</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiOpen(false)}
                  className="fc-surface fc-hover flex h-10 w-10 items-center justify-center rounded-2xl border transition"
                  aria-label="Close AI assistant"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="fc-surface rounded-3xl border p-4">
                  <p className="text-sm font-medium text-[var(--fc-theme-text)]">
                    {getTimeAwareGreeting(user?.username)}
                  </p>
                </div>

                <div className="grid gap-2">
                  {aiSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setAiPrompt(suggestion);
                        setAiResponse(
                          buildLocalAiResponse({
                            prompt: suggestion,
                            messages: visibleMessages,
                            conversationName: activeConversationDisplayName,
                          }),
                        );
                      }}
                      className="fc-surface fc-hover rounded-2xl border px-4 py-3 text-left text-sm text-[var(--fc-text-muted)] transition hover:border-[rgba(var(--fc-primary-rgb),0.25)] hover:text-[var(--fc-theme-text)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(event) =>
                    setAiPrompt(event.target.value.slice(0, 600))
                  }
                  rows={5}
                  placeholder="Ask for a summary, rewrite, or reply idea..."
                  className="fc-input w-full resize-none rounded-3xl border px-4 py-4 text-sm leading-relaxed outline-none transition"
                />

                <button
                  type="button"
                  onClick={handleAskAi}
                  className="fc-button-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition hover:scale-[1.01]"
                >
                  <Sparkles size={18} />
                  Ask AI
                </button>

                {aiResponse ? (
                  <div className="fc-button-soft rounded-3xl border p-4 text-sm leading-relaxed">
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
