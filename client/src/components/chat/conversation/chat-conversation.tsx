"use client";

import {
  type CSSProperties,
  Fragment,
  memo,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";

import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Download,
  FileText,
  Forward,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Palette,
  Pause,
  Pencil,
  Phone,
  PlayCircle,
  Reply,
  RefreshCw,
  Search,
  SendHorizonal,
  SmilePlus,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  EmojiStyle,
  Theme,
  type EmojiClickData,
  type PickerProps,
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
  uploadMedia,
} from "@/services/upload.service";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { Message, useSocketStore } from "@/store/socket-store";
import { useCallStore } from "@/store/call-store";
import { useBlockStore } from "@/store/block-store";
import { useBookmarkStore } from "@/store/bookmark-store";
import { useToastStore } from "@/store/toast-store";
import { updateConversationInQueryCache } from "@/lib/conversation-query-cache";
import type { ConversationQueryCache } from "@/lib/conversation-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { getServerNow } from "@/lib/server-time";
import { triggerHaptic } from "@/lib/haptics";
import { generateId } from "@/lib/uuid";
import { formatDisplayName } from "@/lib/user-display";
import {
  CHAT_THEMES,
  DEFAULT_CHAT_THEME_ID,
  applyGlobalChatTheme,
  getChatTheme,
  getChatThemeStyle,
} from "@/lib/chat-themes";
import type { ChatTheme } from "@/lib/chat-themes";
import { useConversationStore } from "@/stores/conversation.store";
import {
  mergeMessageIntoQueryCache,
  removeMessagesFromQueryCache,
} from "@/lib/message-query-cache";
import type { MessageQueryCache } from "@/lib/message-query-cache";
import type { Conversation } from "@/types/conversation";

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_PROFILE_MEMBERS: NonNullable<Conversation["members"]> = [];
const MESSAGE_ROW_ESTIMATE = 118;
const MESSAGE_ROW_OVERSCAN = 12;
const MARK_SEEN_FLUSH_DELAY_MS = 120;
const MESSAGE_EVERYONE_ACTION_WINDOW_MS = 48 * 60 * 60 * 1000;
const QUICK_REACTIONS = ["❤️", "👍", "👎", "🔥", "🥰", "👏", "😁"];
const LEGACY_INLINE_REACTIONS = [
  "\uD83D\uDD25",
  "\uD83D\uDC4F",
  "\uD83D\uDE2E",
  "\uD83D\uDE22",
];
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

const EmojiPicker = dynamic<PickerProps>(
  () => import("emoji-picker-react").then((module) => module.default),
  {
    ssr: false,
    loading: () => (
      <div className="fc-skeleton h-[min(316px,42dvh)] w-full animate-pulse rounded-[22px]" />
    ),
  },
);

const DAY_MS = 24 * 60 * 60 * 1000;
const LARGE_FILE_CARD_BYTES = 15 * 1024 * 1024;

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

function getMessageSearchText(message: Message) {
  return [
    message.text,
    message.replyTo?.text,
    getMessagePreviewText(message),
  ]
    .filter(Boolean)
    .join(" ");
}

function renderHighlightedText(
  text: string | null | undefined,
  query: string,
): ReactNode {
  const value = text ?? "";
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return value;
  }

  const lowerValue = value.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = lowerValue.indexOf(lowerQuery);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(value.slice(cursor, matchIndex));
    }

    const matchEnd = matchIndex + normalizedQuery.length;

    parts.push(
      <mark
        key={`${matchIndex}-${matchEnd}-${parts.length}`}
        className="rounded bg-[#FDE047]/85 px-0.5 text-[#111827]"
      >
        {value.slice(matchIndex, matchEnd)}
      </mark>,
    );

    cursor = matchEnd;
    matchIndex = lowerValue.indexOf(lowerQuery, cursor);
  }

  if (cursor < value.length) {
    parts.push(value.slice(cursor));
  }

  return parts.length ? parts : value;
}

function buildVoiceWaveform(url: string) {
  const seed =
    Array.from(url).reduce((sum, character) => sum + character.charCodeAt(0), 0) ||
    19;

  return Array.from({ length: 30 }, (_, index) => {
    const wave = Math.sin((index + 1) * 1.37 + seed * 0.017);
    const pulse = Math.cos((index + 3) * 0.91 + seed * 0.011);

    return 9 + Math.round(Math.abs(wave * 18) + Math.abs(pulse * 7));
  });
}

function getLocalDayStart(time: number) {
  const date = new Date(time);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function formatDateDivider(createdAt?: string, now?: number) {
  if (!createdAt) {
    return "";
  }
  const targetNow = now ?? (Date.now() + (typeof window !== "undefined" ? window.__serverTimeOffset ?? 0 : 0));

  const time = new Date(createdAt).getTime();

  if (Number.isNaN(time)) {
    return "";
  }

  const date = new Date(time);
  const storyDay = getLocalDayStart(time).getTime();
  const today = getLocalDayStart(targetNow).getTime();
  const yesterday = today - DAY_MS;

  if (storyDay === today) {
    return "Today";
  }

  if (storyDay === yesterday) {
    return "Yesterday";
  }

  return (
    date.getFullYear() === new Date(targetNow).getFullYear()
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

  const offset = typeof window !== "undefined" ? window.__serverTimeOffset ?? 0 : 0;
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

function isAudioAttachment(url: string) {
  return /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url);
}

function getMediaFromMessage(message: Message) {
  const typedMediaId = message.mediaId?.trim();

  if (
    !message.attachment &&
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

    if (isAudioAttachment(url)) {
      return {
        type: "audio" as const,
        url,
        label: message.fileName ?? getAttachmentLabel(url),
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

function canMutateForEveryone(
  message: Message,
  currentUserId?: string | null,
) {
  if (
    message.deletedAt ||
    message.optimistic ||
    message.status === "sending" ||
    (message.senderId !== currentUserId && message.senderId !== "me") ||
    !message.createdAt
  ) {
    return false;
  }

  const createdAt = new Date(message.createdAt).getTime();

  return (
    Number.isFinite(createdAt) &&
    Date.now() - createdAt <= MESSAGE_EVERYONE_ACTION_WINDOW_MS
  );
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
  currentUserId?: string;
  starred: boolean;
  dateDividerLabel: string | null;
  reducedMotion: boolean;
  onRetry: (messageId: string) => void;
  onEdit: (message: Message, text: string) => Promise<boolean>;
  onDeleteRequest: (message: Message) => void;
  onReact: (message: Message, emoji: string) => Promise<boolean>;
  onReply: (message: Message) => void;
  onShare: (message: Message) => void;
  onCopy: (message: Message) => Promise<boolean>;
  onToggleStar: (message: Message) => void;
  searchTerm?: string;
  activeSearchMatch?: boolean;
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
  canCopy: boolean;
  starred: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onMoreReactions: () => void;
  onReply: () => void;
  onShare: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onToggleStar: () => void;
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
      className="fc-menu fixed z-[260] flex items-center justify-center gap-1 rounded-2xl border p-2 backdrop-blur-3xl"
      role="menu"
      aria-label="Choose reaction"
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          disabled={disabled}
          className="fc-touch flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-white/10 active:scale-90 disabled:cursor-wait disabled:opacity-60"
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
  canCopy,
  starred,
  onClose,
  onReact,
  onMoreReactions,
  onReply,
  onShare,
  onEdit,
  onCopy,
  onToggleStar,
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
    2 +
    (canReply ? 1 : 0) +
    (canEdit ? 1 : 0) +
    (canCopy ? 1 : 0) +
    (canDelete ? 1 : 0);
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
    "fc-touch flex h-11 w-full items-center gap-3.5 px-4 text-left text-[14.5px] font-bold text-white/95 transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-55";

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
        className="fixed inset-0 z-[255] bg-black/40 backdrop-blur-[1px]"
        onPointerDown={onClose}
      >
        <motion.div
          ref={panelRef}
          initial={{
            opacity: 0,
            scale: 0.92,
            transformOrigin: mine ? "top right" : "top left",
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.94,
          }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 34,
            mass: 0.8,
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
          <div className="fc-menu mb-2.5 flex h-[56px] items-center justify-between rounded-[22px] border px-1.5 shadow-2xl backdrop-blur-3xl">
            {QUICK_REACTIONS.map((emoji, index) => (
              <motion.button
                key={emoji}
                type="button"
                initial={{
                  opacity: 0,
                  scale: 0.75,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 28,
                  delay: index * 0.015,
                }}
                onClick={() => onReact(emoji)}
                disabled={disabled}
                className="fc-touch flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:bg-white/[0.1] active:scale-90 disabled:cursor-wait disabled:opacity-55"
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </motion.button>
            ))}

            <button
              type="button"
              onClick={onMoreReactions}
              disabled={disabled}
              className="fc-touch flex h-10 w-10 items-center justify-center rounded-full text-[var(--fc-primary)] transition hover:bg-[var(--fc-primary)]/10 active:scale-90 disabled:cursor-wait disabled:opacity-55"
              aria-label="More reactions"
            >
              <SmilePlus size={20} />
            </button>
          </div>

          <div className="fc-menu overflow-hidden rounded-[20px] border py-1 shadow-2xl backdrop-blur-3xl">
            {canReply ? (
              <button
                type="button"
                onClick={onReply}
                className={actionButtonClass}
              >
                <Reply
                  size={20}
                  className="text-[var(--fc-primary)]"
                />
                Reply
              </button>
            ) : null}

            <button
              type="button"
              onClick={onShare}
              className={actionButtonClass}
            >
              <Forward
                size={20}
                className="text-[var(--fc-primary)]"
              />
              Forward
            </button>

            {canEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className={actionButtonClass}
              >
                <Pencil
                  size={20}
                  className="text-[var(--fc-primary)]"
                />
                Edit
              </button>
            ) : null}

            {canCopy ? (
              <button
                type="button"
                onClick={onCopy}
                className={actionButtonClass}
              >
                <Clipboard
                  size={20}
                  className="text-[var(--fc-primary)]"
                />
                Copy
              </button>
            ) : null}

            <button
              type="button"
              onClick={onToggleStar}
              className={actionButtonClass}
            >
              <Star
                size={20}
                className={starred ? "fill-[var(--fc-primary)] text-[var(--fc-primary)]" : "text-[var(--fc-primary)]"}
              />
              {starred ? "Unstar" : "Star"}
            </button>

            <div className="my-1 h-px bg-white/5" />

            {canDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={disabled}
                className={`${actionButtonClass} text-red-400 hover:bg-red-500/10`}
              >
                <Trash2 size={20} />
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
        {type === "image" ? (
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="block w-full text-left"
            aria-label="Open image"
          >
            {preview}
          </button>
        ) : (
          <div className="relative bg-black">
            <video
              src={url}
              preload="metadata"
              playsInline
              controls
              className="aspect-video max-h-80 max-w-full cursor-pointer object-contain"
            />
          </div>
        )}

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
              className="fixed inset-0 z-[285] flex items-center justify-center bg-black/90 p-3 text-white sm:backdrop-blur-xl"
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
                    decoding="async"
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

function MessageVoiceAttachment({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const waveform = useMemo(() => buildVoiceWaveform(url), [url]);
  const progress =
    duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  function handleTogglePlay() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    audio.playbackRate = playbackRate;
    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  }

  function handleSeek(event: ReactMouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;

    if (!audio || duration <= 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextProgress = clamp(
      (event.clientX - bounds.left) / bounds.width,
      0,
      1,
    );

    audio.currentTime = nextProgress * duration;
    setCurrentTime(audio.currentTime);
  }

  function cyclePlaybackRate() {
    setPlaybackRate((currentRate) =>
      currentRate === 1 ? 1.5 : currentRate === 1.5 ? 2 : 1,
    );
  }

  return (
    <div className="mb-3 flex w-[min(78vw,316px)] items-center gap-2 rounded-2xl border border-white/10 bg-black/[0.16] px-3 py-2.5 text-white/85">
      <button
        type="button"
        onClick={handleTogglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-white transition hover:bg-white/[0.18]"
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? <Pause size={17} /> : <PlayCircle size={19} />}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleSeek}
          className="flex h-8 w-full items-center gap-[3px]"
          aria-label="Seek voice message"
        >
          {waveform.map((height, index) => {
            const active = index / waveform.length <= progress;

            return (
              <span
                key={index}
                className={`w-1 flex-1 rounded-full transition-colors ${
                  active
                    ? "bg-[var(--fc-accent-text)]"
                    : "bg-white/[0.22]"
                }`}
                style={{
                  height: `${height}px`,
                }}
              />
            );
          })}
        </button>

        <div className="mt-0.5 flex items-center justify-between text-[11px] font-medium text-white/55">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={cyclePlaybackRate}
        className="h-8 min-w-10 rounded-full bg-white/10 px-2 text-[11px] font-semibold transition hover:bg-white/15"
        aria-label="Change voice playback speed"
      >
        {playbackRate}x
      </button>

      <a
        href={url}
        download
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
        aria-label="Download voice message"
      >
        <Download size={14} />
      </a>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0;
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;

          setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        className="hidden"
      />
    </div>
  );
}

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  previous,
  mine,
  currentUserId,
  starred,
  dateDividerLabel,
  reducedMotion,
  onRetry,
  onEdit,
  onDeleteRequest,
  onReact,
  onReply,
  onShare,
  onCopy,
  onToggleStar,
  searchTerm = "",
  activeSearchMatch = false,
}: ChatMessageRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
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
  const grouped = useMemo(
    () =>
      previous?.senderId === message.senderId &&
      isSameMessageDay(previous?.createdAt, message.createdAt),
    [
      message.createdAt,
      message.senderId,
      previous?.createdAt,
      previous?.senderId,
    ],
  );
  const isDeleted = !!message.deletedAt;
  const isSettled = !message.optimistic && message.status !== "sending";
  const canEdit =
    canMutateForEveryone(message, currentUserId) &&
    !message.attachment &&
    !message.audio &&
    !!message.text;
  const canDelete = isSettled && !isDeleted;
  const canCopy = isSettled && !isDeleted && !!message.text?.trim();
  const canReply = isSettled && !isDeleted;
  const media = useMemo(
    () => getMediaFromMessage(message),
    [message],
  );
  const messageTime = useMemo(
    () => formatMessageTime(message.createdAt),
    [message.createdAt],
  );
  const highlightedReplyText = useMemo(
    () => renderHighlightedText(message.replyTo?.text, searchTerm),
    [message.replyTo?.text, searchTerm],
  );
  const highlightedMessageText = useMemo(
    () => renderHighlightedText(message.text, searchTerm),
    [message.text, searchTerm],
  );
  const rowStyle = useMemo<CSSProperties | undefined>(() => {
    const transform =
      swipeX || actionsOpen
        ? `translate3d(${swipeX}px, 0, 0) scale(${actionsOpen ? 1.012 : 1})`
        : undefined;
    const transition =
      swipingReply || reducedMotion
        ? "none"
        : undefined;

    if (!transform && !transition) {
      return undefined;
    }

    return {
      transform,
      transition,
    };
  }, [
    actionsOpen,
    reducedMotion,
    swipeX,
    swipingReply,
  ]);
  const showLegacyInlineReactionPicker = false;

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

  function submitDelete() {
    triggerHaptic(10);
    closeActions();
    onDeleteRequest(message);
  }

  async function submitCopy() {
    setIsMutating(true);
    const ok = await onCopy(message);
    setIsMutating(false);

    if (ok) {
      closeActions();
    }
  }

  async function submitReaction(emoji: string) {
    triggerHaptic(10);
    setIsMutating(true);
    const ok = await onReact(message, emoji);
    setIsMutating(false);

    if (ok) {
      closeActions();
    }
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
    }, 500);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pressStart = pressStartRef.current;

    if (!pressStart) {
      return;
    }

    if (
      Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) >
      15
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

  function handleClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (
      isDeleted ||
      isEditing ||
      isInteractiveMessageTarget(event.target)
    ) {
      return;
    }

    const now = Date.now();

    if (now - lastTapRef.current <= 280) {
      lastTapRef.current = 0;
      void submitReaction("\u2764\uFE0F");
      return;
    }

    lastTapRef.current = now;
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
      triggerHaptic(10);
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
      {dateDividerLabel !== null ? (
        <div className="my-2.5 flex justify-center">
          <span className="bg-white/[0.05] rounded-full px-3 py-1 text-[11px] font-semibold text-white/28">
            {dateDividerLabel}
          </span>
        </div>
      ) : null}

      <div
        ref={rowRef}
        style={rowStyle}
        className={`flex ${grouped ? "mt-0.5" : "mt-2"} ${
          mine ? "justify-end" : "justify-start"
        } group/message relative ${actionsOpen ? "z-[266]" : "z-0"} [transition:transform_0.2s_cubic-bezier(0.22,1,0.36,1)] px-3 sm:px-4`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
        }}
        onPointerCancel={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
          if (lastTapRef.current) lastTapRef.current = 0;
        }}
        onPointerLeave={() => {
          pressStartRef.current = null;
          clearLongPressTimer();
          if (lastTapRef.current) lastTapRef.current = 0;
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {canReply ? (
          <div
            className={`fc-button-soft pointer-events-none absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border transition-opacity ${
              mine ? "right-[calc(100%-2.5rem)]" : "left-1"
            } ${swipeX >= 40 ? "opacity-100" : "opacity-0"}`}
          >
            <Reply size={14} />
          </div>
        ) : null}

        <div
          ref={bubbleRef}
          style={{
            background: !isDeleted
              ? mine
                ? "var(--fc-own-bubble)"
                : "var(--fc-their-bubble)"
              : undefined,
            color: !isDeleted
              ? mine
                ? "var(--fc-own-bubble-text)"
                : "var(--fc-their-bubble-text)"
              : undefined,
            borderRadius: mine
              ? "18px 18px 5px 18px"
              : "18px 18px 18px 5px",
          }}
          className={`fc-message-bubble relative max-w-[74%] px-3.5 py-2 text-white shadow-md sm:max-w-[70%] sm:px-4 sm:py-2.5 ${
            !mine && !isDeleted ? "border border-white/[0.05]" : ""
          } ${message.status === "failed" ? "ring-1 ring-red-400/35" : ""} ${
            activeSearchMatch ? "ring-2 ring-[#FDE047]/70" : ""
          } ${
            isDeleted
              ? "border border-white/[0.08] bg-[#16161D] text-white/40"
              : ""
          }`}
        >
          {message.replyTo ? (
            <div className="mb-2 rounded-xl border border-white/[0.05] border-l-[3px] border-l-[#7C4FF0] bg-white/[0.03] px-3 py-2 text-[12px] text-white/85">
              <p className="font-bold text-[#7C4FF0]">Reply</p>
              <p className="mt-0.5 line-clamp-2">
                {highlightedReplyText}
              </p>
            </div>
          ) : null}

          {message.forwardedFrom && !isDeleted ? (
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/35">
              <Forward size={11} />
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
            <p className="italic text-[14px]">This message was deleted</p>
          ) : null}

          {message.status === "failed" && mine && !isDeleted ? (
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-red-300 hover:text-red-200"
            >
              <RefreshCw size={12} />
              Tap to retry
            </button>
          ) : null}
          {!isDeleted && media ? (
            <div className="mb-1">
              {media.type === "image" ? (
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
              ) : media.type === "audio" ? (
                <MessageVoiceAttachment url={media.url} />
              ) : (
                <MessageFileAttachment
                  url={media.url}
                  label={media.label}
                  size={media.size}
                />
              )}
            </div>
          ) : null}

          {!isDeleted && message.audio ? (
            <div className="mb-1">
              <MessageVoiceAttachment url={message.audio} />
            </div>
          ) : null}

          {!isDeleted && isEditing ? (
            <div className="space-y-3 min-w-[200px]">
              <textarea
                value={draftText}
                onChange={(event) =>
                  setDraftText(event.target.value.slice(0, 4000))
                }
                autoFocus
                rows={3}
                className="fc-input w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[14.5px] leading-relaxed outline-none transition"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftText(message.text ?? "");
                    setIsEditing(false);
                  }}
                  disabled={isMutating}
                  className="flex h-9 items-center justify-center rounded-xl bg-white/[0.08] px-3 text-[13px] font-bold text-white/60 transition active:scale-95 disabled:opacity-60"
                  aria-label="Cancel edit"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void submitEdit();
                  }}
                  disabled={isMutating || !draftText.trim()}
                  className="flex h-9 items-center justify-center rounded-xl bg-[#7C4FF0] px-4 text-[13px] font-bold text-white transition hover:scale-105 active:scale-95 disabled:opacity-60 shadow-lg shadow-[#7C4FF0]/20"
                  aria-label="Save edit"
                >
                  Save
                </button>
              </div>
            </div>
          ) : !isDeleted && message.text && !media ? (
            <div className="relative pb-0.5">
              <p className="whitespace-pre-wrap break-words pr-14 text-[13.5px] leading-relaxed">
                {highlightedMessageText}
              </p>
              <div className={`absolute bottom-[-2px] right-[-4px] flex items-center gap-1 text-[10px] font-bold tracking-tight ${mine ? "text-white/45" : "text-white/25"}`}>
                {message.editedAt && !isDeleted ? <span>edited</span> : null}
                <span suppressHydrationWarning>{messageTime}</span>
                {mine ? (
                  <MessageStatus status={message.status} size={11} className="shrink-0" />
                ) : null}
              </div>
            </div>
          ) : !isDeleted && (media || message.audio) ? (
            <div className="relative">
              {/* Media rendering happened above */}
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                {message.editedAt && !isDeleted ? <span>edited</span> : null}
                <span suppressHydrationWarning>{messageTime}</span>
                {mine ? (
                  <MessageStatus status={message.status} size={11} className="shrink-0" />
                ) : null}
              </div>
            </div>
          ) : null}

          {!isDeleted && message.reactions?.length ? (
            <div className="mt-2 flex flex-wrap justify-end gap-1">
              {message.reactions.map((reaction) => (
                <span
                  key={reaction.emoji}
                  className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm"
                >
                  {reaction.emoji} {reaction.count}
                </span>
              ))}
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
              canCopy={canCopy}
              starred={starred}
              onClose={closeActions}
              onReact={(emoji) => {
                void submitReaction(emoji);
              }}
              onMoreReactions={() => {
                setActionsOpen(false);
                setReactionAnchorRect(actionAnchorRect);
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
              onCopy={() => {
                void submitCopy();
              }}
              onToggleStar={() => {
                triggerHaptic(10);
                onToggleStar(message);
                closeActions();
              }}
              onDelete={() => {
                submitDelete();
              }}
            />
          ) : null}

          {showLegacyInlineReactionPicker &&
          reactionAnchorRect &&
          !isDeleted ? (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
              {LEGACY_INLINE_REACTIONS.map((emoji) => (
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
        </div>
      </div>
    </Fragment>
  );
});

type FailedAttachmentUpload = {
  file: File;
  message: string;
};

type ForwardConversationItem = {
  id: string;
  avatar: string | null;
  displayName: string;
  latestMessage: string;
  searchText: string;
};

type ProfileMemberItem = {
  id: string;
  avatar?: string | null;
  displayName: string;
};

const ProfileMemberRow = memo(function ProfileMemberRow({
  member,
}: {
  member: ProfileMemberItem;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-1 py-2">
      <FlexAvatar
        src={member.avatar}
        name={member.displayName}
        className="fc-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
      />
      <p className="truncate text-sm text-[var(--fc-theme-text)]">
        {member.displayName}
      </p>
    </div>
  );
});

const ForwardConversationRow = memo(function ForwardConversationRow({
  conversation,
  selected,
  disabled,
  onToggle,
}: {
  conversation: ForwardConversationItem;
  selected: boolean;
  disabled: boolean;
  onToggle: (conversationId: string) => void;
}) {
  const handleClick = useCallback(() => {
    onToggle(conversation.id);
  }, [conversation.id, onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
        selected
          ? "fc-active"
          : "fc-surface hover:bg-[var(--fc-app-surface-hover)]"
      } disabled:cursor-wait disabled:opacity-70`}
    >
      <FlexAvatar
        src={conversation.avatar}
        name={conversation.displayName}
        className="fc-brand-gradient flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-bold text-white"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--fc-theme-text)]">
          {conversation.displayName}
        </p>
        <p className="fc-subtle truncate text-xs">
          {conversation.latestMessage}
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
});

const ThemeOptionCard = memo(function ThemeOptionCard({
  theme,
  selected,
  applyingForMe,
  applyingForBoth,
  disabled,
  onApply,
}: {
  theme: ChatTheme;
  selected: boolean;
  applyingForMe: boolean;
  applyingForBoth: boolean;
  disabled: boolean;
  onApply: (themeId: string, scope: "me" | "both") => void;
}) {
  const applyForMe = useCallback(() => {
    onApply(theme.id, "me");
  }, [onApply, theme.id]);

  const applyForBoth = useCallback(() => {
    onApply(theme.id, "both");
  }, [onApply, theme.id]);

  return (
    <div
      className={`overflow-hidden rounded-2xl border p-3 ${
        selected ? "fc-active" : "fc-surface"
      }`}
    >
      <div
        className="h-20 rounded-xl border border-[var(--fc-app-border)]"
        style={{
          background: theme.background,
        }}
      >
        <div className="flex h-full items-end gap-2 p-3">
          <span
            className="h-8 flex-1 rounded-2xl"
            style={{
              background: theme.theirBubble,
            }}
          />
          <span
            className="h-10 flex-1 rounded-2xl"
            style={{
              background: theme.ownBubble,
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{theme.name}</p>
        <span className="fc-surface rounded-full border px-2 py-1 text-[10px] uppercase text-[var(--fc-text-muted)]">
          {theme.mode}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={applyForMe}
          disabled={disabled}
          className="fc-surface fc-hover flex h-10 items-center justify-center rounded-xl border text-xs font-medium text-[var(--fc-theme-text)] transition disabled:cursor-wait disabled:opacity-60"
        >
          {applyingForMe ? "Applying" : "Apply For Me"}
        </button>

        <button
          type="button"
          onClick={applyForBoth}
          disabled={disabled}
          className="flex h-10 items-center justify-center rounded-xl border border-[rgba(var(--fc-primary-rgb),0.22)] bg-[rgba(var(--fc-primary-rgb),0.10)] text-xs font-semibold text-[var(--fc-theme-text)] transition hover:bg-[rgba(var(--fc-primary-rgb),0.16)] disabled:cursor-wait disabled:opacity-60"
        >
          {applyingForBoth ? "Applying" : "Apply For Both"}
        </button>
      </div>
    </div>
  );
});

const AiSuggestionButton = memo(function AiSuggestionButton({
  suggestion,
  onSelect,
}: {
  suggestion: string;
  onSelect: (suggestion: string) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(suggestion);
  }, [onSelect, suggestion]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fc-surface fc-hover rounded-2xl border px-4 py-3 text-left text-sm text-[var(--fc-text-muted)] transition hover:border-[rgba(var(--fc-primary-rgb),0.25)] hover:text-[var(--fc-theme-text)]"
    >
      {suggestion}
    </button>
  );
});

export default function ChatConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(
    null,
  );
  const [deleteTargetMessage, setDeleteTargetMessage] =
    useState<Message | null>(null);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);
  const [deleteForMe, setDeleteForMe] = useState(true);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
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
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [mobileBackSwipeX, setMobileBackSwipeX] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
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
  const virtualListOffsetRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const hasAnchoredInitialMessagesRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollMeasureFrameRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingSeenConversationIdRef = useRef<string | null>(null);
  const seenFlushTimerRef = useRef<number | null>(null);
  const flushPendingSeenMessagesRef = useRef<(() => void) | null>(null);
  const mobileBackSwipeRef = useRef<{
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const mobileBackSwipeFrameRef =
    useRef<number | null>(null);
  const pendingMobileBackSwipeXRef =
    useRef(0);
  const [virtualScrollMargin, setVirtualScrollMargin] = useState(0);
  const [isWindowFocused, setIsWindowFocused] = useState(
    () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      document.hasFocus(),
  );
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const checkedUnreadInitRef = useRef<string | null>(null);
  const reducedMotion = useReducedMotion();
  const now = useServerNow();
  const pushToast = useToastStore((state) => state.pushToast);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(96);

  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setComposerHeight(entry.target.getBoundingClientRect().height);
      }
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }
  }, [composerHeight]);
  const {
    bookmarks,
    addBookmark,
    removeBookmark,
  } = useBookmarkStore(
    useShallow((state) => ({
      bookmarks: state.bookmarks,
      addBookmark: state.addBookmark,
      removeBookmark: state.removeBookmark,
    }))
  );

  const {
    blockedConversationIds,
    blockEvents,
    blockConversation,
    unblockConversation,
  } = useBlockStore(
    useShallow((state) => ({
      blockedConversationIds: state.blockedConversationIds,
      blockEvents: state.blockEvents,
      blockConversation: state.blockConversation,
      unblockConversation: state.unblockConversation,
    }))
  );

  const conversationsQuery = useConversationsQuery();
  const {
    activeConversationId,
    activeConversationPatch,
  } = useConversationStore(
    useShallow((state) => ({
      activeConversationId: state.activeConversationId,
      activeConversationPatch:
        state.activeConversationId ? state.conversationPatches[state.activeConversationId] : undefined,
    }))
  );
  const conversationById = useMemo(() => {
    const conversations = conversationsQuery.data ?? [];

    return new Map(
      conversations.map((conversation) => [conversation.id, conversation]),
    );
  }, [conversationsQuery.data]);
  const activeConversation = useMemo(() => {
    const conversation =
      activeConversationId
        ? (conversationById.get(activeConversationId) ?? null)
        : null;

    if (!conversation) {
      return null;
    }

    return activeConversationPatch
      ? {
          ...conversation,
          ...activeConversationPatch,
        }
      : conversation;
  }, [activeConversationId, activeConversationPatch, conversationById]);
  const conversationId = activeConversationId;
  const currentUserId = user?.id;
  const messagesQuery = useMessagesQuery(conversationId);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = messagesQuery;
  const {
    realtimeMessages,
    socket,
    isConnected,
    isConnecting,
    connectionError,
    typingUsers,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendSocketMessage,
    startTyping,
    stopTyping,
    retryMessage,
    setConnectionError,
  } = useSocketStore(
    useShallow((state) => ({
      realtimeMessages: conversationId
        ? (state.messagesByConversation[conversationId] ?? EMPTY_MESSAGES)
        : EMPTY_MESSAGES,
      socket: state.socket,
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
      connectionError: state.connectionError,
      typingUsers: state.typingUsers,
      onlineUsers: state.onlineUsers,
      joinConversation: state.joinConversation,
      leaveConversation: state.leaveConversation,
      sendSocketMessage: state.sendMessage,
      startTyping: state.startTyping,
      stopTyping: state.stopTyping,
      retryMessage: state.retryMessage,
      setConnectionError: state.setConnectionError,
    }))
  );

  const remoteTypingUsers = useMemo(() => {
    return typingUsers.filter(
      (typingUserId: string) => typingUserId !== currentUserId,
    );
  }, [typingUsers, currentUserId]);

  const isOnline = useMemo(() => {
    return (
      activeConversation?.memberIds?.some(
        (memberId: string) =>
          memberId !== currentUserId && onlineUsers.includes(memberId),
      ) ?? false
    );
  }, [activeConversation?.memberIds, currentUserId, onlineUsers]);
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

  const handleDeleteMessageRequest = useCallback(
    (message: Message) => {
      const canDeleteEverywhere =
        canMutateForEveryone(message, currentUserId);

      setDeleteTargetMessage(message);
      setDeleteForEveryone(canDeleteEverywhere);
      setDeleteForMe(true);
    },
    [currentUserId],
  );

  async function handleConfirmDeleteMessage() {
    if (
      !deleteTargetMessage ||
      isDeletingMessage ||
      (!deleteForMe && !deleteForEveryone)
    ) {
      return;
    }

    const scope =
      deleteForEveryone ? "everyone" : "me";

    setIsDeletingMessage(true);

    try {
      const response = await deleteMessage({
        messageId: deleteTargetMessage.id,
        conversationId: deleteTargetMessage.conversationId,
        scope,
      });

      if (response.mode === "everyone") {
        mergeMutatedMessage(response.message as Message);
      } else {
        removeLocalMessages([response.messageId]);
      }

      pushToast({
        title: "Message deleted",
        variant: "success",
      });
      setDeleteTargetMessage(null);
      setDeleteForEveryone(false);
      setDeleteForMe(true);
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message.toLowerCase().includes("already")
          ? "Message already deleted"
          : "That message could not be deleted right now.";

      pushToast({
        title:
          message === "Message already deleted"
            ? "Message already deleted"
            : "Delete failed",
        message:
          message === "Message already deleted"
            ? undefined
            : message,
        variant: "error",
      });
    } finally {
      setIsDeletingMessage(false);
    }
  }

  const handleCopyMessage = useCallback(
    async (message: Message) => {
      const value = message.text?.trim();

      if (!value) {
        return false;
      }

      try {
        await navigator.clipboard.writeText(value);
        pushToast({
          title: "Copied",
          variant: "success",
        });

        return true;
      } catch {
        pushToast({
          title: "Copy failed",
          message:
            "Clipboard access is not available in this browser.",
          variant: "error",
        });

        return false;
      }
    },
    [pushToast],
  );

  const handleToggleStarMessage = useCallback(
    (message: Message) => {
      if (bookmarks.some((bookmark) => bookmark.id === message.id)) {
        removeBookmark(message.id);
        pushToast({
          title: "Message unstarred",
          variant: "info",
        });
        return;
      }

      addBookmark({
        id: message.id,
        text: getMessagePreviewText(message),
      });
      pushToast({
        title: "Message starred",
        variant: "success",
      });
    },
    [
      addBookmark,
      bookmarks,
      pushToast,
      removeBookmark,
    ],
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

  const flushPendingSeenMessages = useCallback(() => {
    const targetConversationId = pendingSeenConversationIdRef.current;
    const messageIds = Array.from(pendingSeenMessageIdsRef.current);

    if (!targetConversationId || !messageIds.length) {
      pendingSeenMessageIdsRef.current.clear();
      pendingSeenConversationIdRef.current = null;
      return;
    }

    if (!socket || !isConnected) {
      return;
    }

    // Phase 1 focus guard:
    if (
      typeof document !== "undefined" &&
      (document.visibilityState !== "visible" || !document.hasFocus())
    ) {
      return;
    }

    pendingSeenMessageIdsRef.current.clear();
    pendingSeenConversationIdRef.current = null;
    messageIds.forEach((messageId) => {
      seenMessageIdsRef.current.add(messageId);
    });

    socket.emit(SOCKET_EVENTS.MARK_MESSAGES_SEEN, {
      conversationId: targetConversationId,
      messageIds,
    });
  }, [isConnected, socket]);

  useEffect(() => {
    flushPendingSeenMessagesRef.current = flushPendingSeenMessages;
  }, [flushPendingSeenMessages]);

  const visibleMessages = useMemo(() => {
    if (!conversationId) {
      return [];
    }

    const serverMessages = (messagesQuery.data ?? []) as Message[];

    return mergeMessages(serverMessages, realtimeMessages);
  }, [conversationId, realtimeMessages, messagesQuery.data]);
  const starredMessageIds = useMemo(
    () =>
      new Set(
        bookmarks.map((bookmark) => bookmark.id),
      ),
    [bookmarks],
  );
  const normalizedMessageSearch = messageSearch.trim().toLowerCase();
  const messageSearchMatches = useMemo(() => {
    if (!normalizedMessageSearch) {
      return [];
    }

    return visibleMessages.reduce<
      {
        messageId: string;
        index: number;
      }[]
    >((matches, message, index) => {
      if (message.deletedAt) {
        return matches;
      }

      if (getMessageSearchText(message).toLowerCase().includes(normalizedMessageSearch)) {
        matches.push({
          messageId: message.id,
          index,
        });
      }

      return matches;
    }, []);
  }, [normalizedMessageSearch, visibleMessages]);
  const activeMessageSearchMatch = messageSearchMatches.length
    ? messageSearchMatches[
        clamp(activeSearchIndex, 0, messageSearchMatches.length - 1)
      ]
    : null;

  // eslint-disable-next-line react-hooks/incompatible-library
  const messageVirtualizer = useVirtualizer({
    count: visibleMessages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => MESSAGE_ROW_ESTIMATE,
    getItemKey: (index) => visibleMessages[index]?.id ?? index,
    overscan: MESSAGE_ROW_OVERSCAN,
    scrollMargin: virtualScrollMargin,
  });
  const virtualRows = messageVirtualizer.getVirtualItems();
  const [unreadRemoteViewportMessageIds, setUnreadRemoteViewportMessageIds] = useState<string[]>([]);

  const visibleMessagesRef = useRef(visibleMessages);
  useEffect(() => {
    visibleMessagesRef.current = visibleMessages;
    updateVisibleUnreadRef.current?.();
  }, [visibleMessages]);

  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
    updateVisibleUnreadRef.current?.();
  }, [currentUserId]);

  const isWindowFocusedRef = useRef(isWindowFocused);
  useEffect(() => {
    isWindowFocusedRef.current = isWindowFocused;
    updateVisibleUnreadRef.current?.();
  }, [isWindowFocused]);

  const updateVisibleUnreadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !conversationId) {
      setUnreadRemoteViewportMessageIds([]);
      updateVisibleUnreadRef.current = null;
      return;
    }

    const updateVisibleUnread = () => {
      const viewportRect = container.getBoundingClientRect();
      const ids: string[] = [];

      const messageElements = container.querySelectorAll("[data-index]");
      
      messageElements.forEach((el) => {
        const indexAttr = el.getAttribute("data-index");
        if (indexAttr === null) return;
        const index = parseInt(indexAttr, 10);
        const message = visibleMessagesRef.current[index];
        if (!message) return;

        if (
          message.senderId === currentUserIdRef.current ||
          message.senderId === "me" ||
          message.status === "read" ||
          seenMessageIdsRef.current.has(message.id) ||
          pendingSeenMessageIdsRef.current.has(message.id)
        ) {
          return;
        }

        const itemRect = el.getBoundingClientRect();
        const isVisible =
          itemRect.top < viewportRect.bottom &&
          itemRect.bottom > viewportRect.top;

        if (isVisible) {
          ids.push(message.id);
        }
      });

      setUnreadRemoteViewportMessageIds((prev) => {
        if (prev.length === ids.length && prev.every((val, i) => val === ids[i])) {
          return prev;
        }
        return ids;
      });
    };

    updateVisibleUnreadRef.current = updateVisibleUnread;
    updateVisibleUnread();

    let frameId: number | null = null;
    const handleScrollEvent = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        updateVisibleUnread();
        frameId = null;
      });
    };

    container.addEventListener("scroll", handleScrollEvent, { passive: true });
    window.addEventListener("resize", handleScrollEvent);

    return () => {
      updateVisibleUnreadRef.current = null;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      container.removeEventListener("scroll", handleScrollEvent);
      window.removeEventListener("resize", handleScrollEvent);
    };
  }, [conversationId]);

  const activeUnreadCount = activeConversation?.unreadCount ?? 0;
  const showInitialMessageSkeleton =
    messagesQuery.isLoading && !visibleMessages.length;
  const callTargetUserId = useMemo(
    () =>
      activeConversation?.memberIds?.find(
        (memberId: string) => memberId !== currentUserId,
      ),
    [activeConversation?.memberIds, currentUserId],
  );

  const activeConversationAvatar = useMemo(
    () =>
      activeConversation
        ? getConversationAvatar(activeConversation, currentUserId)
        : null,
    [activeConversation, currentUserId],
  );
  const activeConversationDisplayName = useMemo(
    () => formatDisplayName(activeConversation?.name ?? "FlexChat"),
    [activeConversation?.name],
  );
  const isConversationBlocked =
    !!conversationId && blockedConversationIds.includes(conversationId);
  const blockEvent =
    conversationId ? blockEvents[conversationId] : undefined;
  const profileMembers = activeConversation?.members ?? EMPTY_PROFILE_MEMBERS;
  const profileMemberItems = useMemo<ProfileMemberItem[]>(
    () =>
      profileMembers.map((member) => ({
        id: member.id,
        avatar: member.avatar,
        displayName: formatDisplayName(member.username),
      })),
    [profileMembers],
  );
  const remoteMember = useMemo(
    () =>
      profileMembers.find((member) => member.id !== currentUserId) ?? null,
    [currentUserId, profileMembers],
  );
  const presenceLabel =
    isConversationBlocked
      ? "Profile hidden"
      : remoteTypingUsers.length
        ? "Typing..."
        : isOnline
          ? "Online"
          : formatLastSeen(remoteMember?.lastSeenAt);
  const connectionStatusLabel = presenceLabel;
  const deleteTargetCanDeleteForEveryone =
    deleteTargetMessage
      ? canMutateForEveryone(
          deleteTargetMessage,
          currentUserId,
        )
      : false;
  const activeTheme = getChatTheme(
    activeConversation?.localThemeId ??
      activeConversation?.sharedThemeId ??
      DEFAULT_CHAT_THEME_ID,
  );
  const activeThemeStyle =
    getChatThemeStyle(activeTheme);

  useEffect(() => {
    function updateVirtualScrollMargin() {
      const nextMargin = virtualListOffsetRef.current?.offsetTop ?? 0;

      setVirtualScrollMargin((currentMargin) =>
        currentMargin === nextMargin ? currentMargin : nextMargin,
      );
    }

    updateVirtualScrollMargin();

    const frameId = window.requestAnimationFrame(updateVirtualScrollMargin);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateVirtualScrollMargin);

    if (containerRef.current) {
      resizeObserver?.observe(containerRef.current);
    }

    window.addEventListener("resize", updateVirtualScrollMargin);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateVirtualScrollMargin);
    };
  }, [
    activeConversation?.id,
    activeUnreadCount,
    blockEvent?.message,
    hasNextPage,
    messagesQuery.isError,
    showInitialMessageSkeleton,
  ]);

  useEffect(() => {
    messageVirtualizer.measure();
  }, [messageVirtualizer, visibleMessages.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleFocusOrVisibility = () => {
      const active =
        document.visibilityState === "visible" && document.hasFocus();
      setIsWindowFocused(active);
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    window.addEventListener("blur", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    // Initial check
    handleFocusOrVisibility();

    return () => {
      window.removeEventListener("focus", handleFocusOrVisibility);
      window.removeEventListener("blur", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, []);

  useEffect(() => {
    if (checkedUnreadInitRef.current !== conversationId) {
      setFirstUnreadMessageId(null);
      checkedUnreadInitRef.current = null;
    }

    if (!conversationId || !currentUserId) {
      return;
    }

    if (checkedUnreadInitRef.current === conversationId) {
      return;
    }

    if (messagesQuery.isLoading) {
      return;
    }

    const firstUnread = visibleMessages.find((msg) => {
      return (
        msg.senderId !== currentUserId &&
        msg.senderId !== "me" &&
        msg.status !== "read"
      );
    });

    if (firstUnread) {
      setFirstUnreadMessageId(firstUnread.id);
    }
    checkedUnreadInitRef.current = conversationId;
  }, [conversationId, visibleMessages, currentUserId, messagesQuery.isLoading]);

  // Remove the unread divider immediately once the conversation's unread
  // count reaches zero, instead of leaving it pinned until the conversation
  // is switched.
  useEffect(() => {
    if (activeUnreadCount <= 0 && firstUnreadMessageId) {
      setFirstUnreadMessageId(null);
    }
  }, [activeUnreadCount, firstUnreadMessageId]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [conversationId, normalizedMessageSearch]);

  useEffect(() => {
    setActiveSearchIndex((currentIndex) =>
      messageSearchMatches.length
        ? Math.min(currentIndex, messageSearchMatches.length - 1)
        : 0,
    );
  }, [messageSearchMatches.length]);

  useEffect(() => {
    if (!messageSearchOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [messageSearchOpen]);

  useEffect(() => {
    if (!activeMessageSearchMatch || !normalizedMessageSearch) {
      return;
    }

    messageVirtualizer.scrollToIndex(activeMessageSearchMatch.index, {
      align: "center",
    });
  }, [
    activeMessageSearchMatch,
    messageVirtualizer,
    normalizedMessageSearch,
  ]);

  useEffect(() => {
    function handleConversationFindShortcut(event: KeyboardEvent) {
      const shouldOpenSearch =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "f";

      if (shouldOpenSearch) {
        event.preventDefault();
        setMessageSearchOpen(true);
        return;
      }

      if (event.key === "Escape" && messageSearchOpen) {
        setMessageSearchOpen(false);
        setMessageSearch("");
      }
    }

    window.addEventListener("keydown", handleConversationFindShortcut);

    return () => {
      window.removeEventListener("keydown", handleConversationFindShortcut);
    };
  }, [messageSearchOpen]);

  useEffect(() => {
    function handleConversationEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (profilePictureOpen) {
        setProfilePictureOpen(false);
        return;
      }

      if (profileOpen) {
        setProfileOpen(false);
        return;
      }

      if (themeSheetOpen) {
        setThemeSheetOpen(false);
        return;
      }

      if (chatSettingsOpen) {
        setChatSettingsOpen(false);
        return;
      }

      if (forwardingMessage && !isForwarding) {
        setForwardingMessage(null);
        setSelectedForwardConversationIds(new Set());
        setForwardSearch("");
        return;
      }

      if (largeVideoFile) {
        setLargeVideoFile(null);
        return;
      }

      if (aiOpen) {
        setAiOpen(false);
        return;
      }

      if (emojiOpen) {
        setEmojiOpen(false);
      }
    }

    window.addEventListener("keydown", handleConversationEscape);

    return () => {
      window.removeEventListener("keydown", handleConversationEscape);
    };
  }, [
    aiOpen,
    chatSettingsOpen,
    emojiOpen,
    forwardingMessage,
    isForwarding,
    largeVideoFile,
    profileOpen,
    profilePictureOpen,
    themeSheetOpen,
  ]);

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
    "fc-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6C7883] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40";
  const headerIconSize = 18;
  const aiSuggestions = useMemo(
    () => [
      "Summarize recent messages",
      "Help me write a warm reply",
      "What media can I send?",
    ],
    [],
  );
  const forwardConversationItems = useMemo<ForwardConversationItem[]>(
    () =>
      (conversationsQuery.data ?? []).map((conversation) => {
        const displayName = formatDisplayName(conversation.name);

        return {
          id: conversation.id,
          avatar: getConversationAvatar(conversation, currentUserId),
          displayName,
          latestMessage: conversation.latestMessage ?? "No messages yet",
          searchText: displayName.toLowerCase(),
        };
      }),
    [conversationsQuery.data, currentUserId],
  );
  const forwardConversations = useMemo(() => {
    const normalizedSearch = forwardSearch.trim().toLowerCase();

    return forwardConversationItems
      .filter((conversation) => {
        if (!normalizedSearch) {
          return true;
        }

        return conversation.searchText.includes(normalizedSearch);
      })
      .slice(0, 60);
  }, [forwardConversationItems, forwardSearch]);

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

  const scheduleMobileBackSwipeX =
    useCallback((nextX: number) => {
      pendingMobileBackSwipeXRef.current =
        nextX;

      if (mobileBackSwipeFrameRef.current !== null) {
        return;
      }

      mobileBackSwipeFrameRef.current =
        window.requestAnimationFrame(() => {
          mobileBackSwipeFrameRef.current = null;
          setMobileBackSwipeX(
            pendingMobileBackSwipeXRef.current
          );
        });
    }, []);

  const setMobileBackSwipeXNow =
    useCallback((nextX: number) => {
      if (mobileBackSwipeFrameRef.current !== null) {
        window.cancelAnimationFrame(
          mobileBackSwipeFrameRef.current
        );
        mobileBackSwipeFrameRef.current = null;
      }

      pendingMobileBackSwipeXRef.current =
        nextX;
      setMobileBackSwipeX(nextX);
    }, []);

  useEffect(
    () => () => {
      if (mobileBackSwipeFrameRef.current !== null) {
        window.cancelAnimationFrame(
          mobileBackSwipeFrameRef.current
        );
        mobileBackSwipeFrameRef.current = null;
      }
    },
    []
  );

  useEffect(
    () => () => {
      if (seenFlushTimerRef.current) {
        window.clearTimeout(seenFlushTimerRef.current);
        seenFlushTimerRef.current = null;
      }

      flushPendingSeenMessagesRef.current?.();
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
    if (seenFlushTimerRef.current) {
      window.clearTimeout(seenFlushTimerRef.current);
      seenFlushTimerRef.current = null;
    }

    flushPendingSeenMessagesRef.current?.();
    pendingSeenMessageIdsRef.current.clear();
    pendingSeenConversationIdRef.current = null;
    seenMessageIdsRef.current.clear();
    hasAnchoredInitialMessagesRef.current = false;
    setMessageSearchOpen(false);
    setMessageSearch("");

    const frameId = window.requestAnimationFrame(() => {
      setReplyingTo(null);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId || !isConnected || !socket) {
      return;
    }

    if (!unreadRemoteViewportMessageIds.length) {
      return;
    }

    // Phase 1 focus guard:
    if (
      typeof document !== "undefined" &&
      (document.visibilityState !== "visible" || !document.hasFocus())
    ) {
      return;
    }

    if (
      pendingSeenConversationIdRef.current &&
      pendingSeenConversationIdRef.current !== conversationId
    ) {
      flushPendingSeenMessages();
    }

    pendingSeenConversationIdRef.current = conversationId;
    unreadRemoteViewportMessageIds.forEach((messageId) => {
      pendingSeenMessageIdsRef.current.add(messageId);
    });

    if (seenFlushTimerRef.current) {
      return;
    }

    seenFlushTimerRef.current = window.setTimeout(() => {
      seenFlushTimerRef.current = null;
      flushPendingSeenMessages();
    }, MARK_SEEN_FLUSH_DELAY_MS);
  }, [
    conversationId,
    currentUserId,
    flushPendingSeenMessages,
    isConnected,
    socket,
    unreadRemoteViewportMessageIds,
  ]);

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
        element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      scrollMeasureFrameRef.current = null;
    });
  }

  function handleConversationTouchStart(event: ReactTouchEvent<HTMLElement>) {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      return;
    }

    const touch = event.touches[0];

    if (!touch || touch.clientX > 28) {
      mobileBackSwipeRef.current = null;
      return;
    }

    mobileBackSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      active: false,
    };
  }

  function handleConversationTouchMove(event: ReactTouchEvent<HTMLElement>) {
    const gesture = mobileBackSwipeRef.current;
    const touch = event.touches[0];

    if (!gesture || !touch) {
      return;
    }

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;

    if (!gesture.active) {
      if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) {
        return;
      }

      gesture.active =
        deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY) * 1.45;
    }

    if (!gesture.active) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    scheduleMobileBackSwipeX(clamp(deltaX, 0, 112));
  }

  function handleConversationTouchEnd() {
    const shouldReturn =
      pendingMobileBackSwipeXRef.current >= 72;

    mobileBackSwipeRef.current = null;
    setMobileBackSwipeXNow(0);

    if (shouldReturn) {
      returnToConversationList();
    }
  }

  function goToPreviousSearchMatch() {
    if (!messageSearchMatches.length) {
      return;
    }

    setActiveSearchIndex((currentIndex) =>
      currentIndex <= 0 ? messageSearchMatches.length - 1 : currentIndex - 1,
    );
  }

  function goToNextSearchMatch() {
    if (!messageSearchMatches.length) {
      return;
    }

    setActiveSearchIndex((currentIndex) =>
      currentIndex >= messageSearchMatches.length - 1 ? 0 : currentIndex + 1,
    );
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
      const uploadedAudio = await uploadMedia(file, {
        purpose: "voice",
        onProgress: (progress) => {
          setAttachmentUploadProgress(Math.min(96, Math.max(6, progress)));
        },
      });

      sendSocketMessage({
        conversationId,
        text: "",
        audio: uploadedAudio.url,
        mediaId: uploadedAudio.publicId,
        fileName: uploadedAudio.fileName,
        fileSize: uploadedAudio.size,
        mimeType: uploadedAudio.mimeType,
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
    triggerHaptic(10);

    try {
      const uploadedAttachment = await uploadMedia(file, {
        purpose: "attachment",
        onProgress: (progress) => {
          setAttachmentUploadProgress(Math.min(96, Math.max(6, progress)));
        },
      });
      const caption = text.trim();

      sendSocketMessage({
        conversationId,
        text: caption,
        type:
          uploadedAttachment.kind === "document"
            ? "file"
            : uploadedAttachment.kind === "image" ||
                uploadedAttachment.kind === "video"
              ? uploadedAttachment.kind
              : "file",
        attachment: uploadedAttachment.url,
        mediaId: uploadedAttachment.publicId,
        fileName: uploadedAttachment.fileName,
        fileSize: uploadedAttachment.size,
        mimeType: uploadedAttachment.mimeType,
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

    triggerHaptic(10);
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

  const handleAskAi = useCallback(() => {
    setAiResponse(
      buildLocalAiResponse({
        prompt: aiPrompt,
        messages: visibleMessages,
        conversationName: activeConversationDisplayName,
      }),
    );
  }, [activeConversationDisplayName, aiPrompt, visibleMessages]);

  const handleAiSuggestionSelect = useCallback(
    (suggestion: string) => {
      setAiPrompt(suggestion);
      setAiResponse(
        buildLocalAiResponse({
          prompt: suggestion,
          messages: visibleMessages,
          conversationName: activeConversationDisplayName,
        }),
      );
    },
    [activeConversationDisplayName, visibleMessages],
  );

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
    triggerHaptic(10);
    closeForwardSheet();
    setEmojiOpen(false);
    setProfileOpen(false);
    setProfilePictureOpen(false);
    useConversationStore.setState({
      activeConversationId: null,
    });
    window.dispatchEvent(new CustomEvent("flexchat:open-mobile-sidebar"));
  }

  const handleApplyTheme = useCallback(async (
    themeId: string | null,
    scope: "me" | "both",
  ) => {
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
  }, [
    activeTheme.id,
    conversationId,
    pushToast,
    queryClient,
  ]);

  function handleStartCall(kind: "voice" | "video") {
    if (!conversationId || !callTargetUserId) {
      return;
    }

    if (isConversationBlocked) {
      showBlockedInteractionToast();
      return;
    }

    triggerHaptic(10);
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

  const toggleForwardTarget = useCallback((conversationId: string) => {
    setSelectedForwardConversationIds((current) => {
      const next = new Set(current);

      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }

      return next;
    });
  }, []);

  function removeLocalMessages(messageIds: string[]) {
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

      removeLocalMessages(optimisticIds);

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
      removeLocalMessages(optimisticIds);
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
        <div className="fc-surface-strong max-w-sm rounded-2xl border p-8 sm:backdrop-blur-xl">
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
      style={{
        ...activeThemeStyle,
        transform: mobileBackSwipeX
          ? `translateX(${mobileBackSwipeX}px)`
          : undefined,
      }}
      className="fc-gpu-accelerated relative flex h-full min-h-0 flex-col overflow-hidden text-[var(--fc-theme-text)] transition-transform duration-150"
      onTouchStart={handleConversationTouchStart}
      onTouchMove={handleConversationTouchMove}
      onTouchEnd={handleConversationTouchEnd}
      onTouchCancel={handleConversationTouchEnd}
    >
      <div
        className="relative z-20 flex min-h-[64px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.03] bg-black/40 px-3 backdrop-blur-3xl py-2 pt-[calc(8px+env(safe-area-inset-top))] sm:min-h-[72px] sm:px-5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={returnToConversationList}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
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
            className="flex min-w-0 items-center gap-3 text-left outline-none transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConversationBlocked}
            aria-label="Open profile"
          >
            <FlexAvatar
              src={activeConversationAvatar}
              name={activeConversation.name}
              className="h-10 w-10 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <h2
                className="truncate text-[14.5px] font-bold tracking-tight text-white leading-none mb-1"
              >
                {activeConversationDisplayName}
              </h2>

              <p
                className={`truncate text-[11px] font-semibold tracking-wide leading-none ${
                  !isConnected && isConnecting
                    ? "text-emerald-400"
                    : !isConnected
                      ? "text-white/40"
                      : isConversationBlocked
                    ? "text-white/40"
                    : remoteTypingUsers.length
                    ? "text-emerald-400"
                    : isOnline
                      ? "text-emerald-400"
                      : "text-white/20"
                }`}
              >
                {connectionStatusLabel}
              </p>
            </div>
          </button>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 sm:gap-2"
        >
          <button
            type="button"
            onClick={() => handleStartCall("voice")}
            disabled={!callTargetUserId || isConversationBlocked}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Start voice call"
          >
            <Phone size={20} />
          </button>

          <button
            type="button"
            onClick={() => handleStartCall("video")}
            disabled={!callTargetUserId || isConversationBlocked}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Start video call"
          >
            <Video size={20} />
          </button>

          <button
            type="button"
            onClick={() => setMessageSearchOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Search messages"
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            onClick={() => setChatSettingsOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Open chat settings"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {messageSearchOpen ? (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: reducedMotion ? 0 : 0.18,
            }}
            className="relative z-10 overflow-hidden border-b border-white/5 bg-[var(--fc-chat-header)] px-2.5 py-2 sm:px-5 sm:backdrop-blur-2xl"
          >
            <div className="flex items-center gap-2">
              <div className="fc-input flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3">
                <Search
                  size={16}
                  className="shrink-0 text-[var(--fc-text-subtle)]"
                />
                <input
                  ref={searchInputRef}
                  value={messageSearch}
                  onChange={(event) => setMessageSearch(event.target.value)}
                  placeholder="Search this chat"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--fc-text-subtle)]"
                />
              </div>

              <span className="hidden min-w-[4.75rem] text-center text-xs font-medium text-[var(--fc-text-muted)] sm:inline">
                {normalizedMessageSearch
                  ? `${messageSearchMatches.length ? activeSearchIndex + 1 : 0}/${messageSearchMatches.length}`
                  : "0/0"}
              </span>

              <button
                type="button"
                onClick={goToPreviousSearchMatch}
                disabled={!messageSearchMatches.length}
                className="fc-surface fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Previous search result"
              >
                <ChevronUp size={17} />
              </button>

              <button
                type="button"
                onClick={goToNextSearchMatch}
                disabled={!messageSearchMatches.length}
                className="fc-surface fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Next search result"
              >
                <ChevronDown size={17} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessageSearchOpen(false);
                  setMessageSearch("");
                }}
                className="fc-surface fc-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition"
                aria-label="Close message search"
              >
                <X size={17} />
              </button>
            </div>

            {normalizedMessageSearch && !messageSearchMatches.length ? (
              <p className="px-2 pt-1.5 text-xs text-[var(--fc-text-muted)]">
                No messages found
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="chat-safe-scroll relative z-10 min-h-0 flex-1 touch-pan-y overscroll-contain overflow-y-auto px-2.5 py-3 sm:px-5 sm:pt-5"
        style={{ paddingBottom: `${composerHeight}px` }}
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

            {messagesQuery.isLoading && !visibleMessages.length ? (
            <div className="flex-1 space-y-6 overflow-hidden px-4 py-8">
              {[false, true, false, false, true].map((mine, idx) => (
                <div
                  key={idx}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[80%] gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                    {!mine && <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/5" />}
                    <div className="space-y-2">
                      <div className={`h-12 w-48 animate-pulse rounded-2xl bg-white/5 ${mine ? "rounded-tr-none" : "rounded-tl-none"}`} />
                      <div className={`h-3 w-12 animate-pulse rounded-full bg-white/5 ${mine ? "ml-auto" : ""}`} />
                    </div>
                  </div>
                </div>
              ))}
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

            <div
              ref={virtualListOffsetRef}
              className="relative w-full"
              style={{
                height: `${messageVirtualizer.getTotalSize()}px`,
              }}
            >
              {virtualRows.map((virtualRow) => {
                const message = visibleMessages[virtualRow.index];

                if (!message) {
                  return null;
                }

                const mine =
                  message.senderId === user?.id || message.senderId === "me";
                const previous = visibleMessages[virtualRow.index - 1];
                const dateDividerLabel =
                  !previous ||
                  !isSameMessageDay(
                    previous.createdAt,
                    message.createdAt,
                  )
                    ? formatDateDivider(message.createdAt, now)
                    : null;

                return (
                  <div
                    key={virtualRow.key}
                    ref={messageVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      transform: `translateY(${
                        virtualRow.start - virtualScrollMargin
                      }px)`,
                    }}
                  >
                    {message.id === firstUnreadMessageId ? (
                      <div className="mb-5 mt-2 flex items-center gap-3 px-4">
                        <div className="h-px flex-1 bg-[rgba(var(--fc-primary-rgb),0.3)]" />
                        <span className="fc-button-soft rounded-full border px-3 py-1 text-xs">
                          Unread messages
                        </span>
                        <div className="h-px flex-1 bg-[rgba(var(--fc-primary-rgb),0.3)]" />
                      </div>
                    ) : null}
                    <ChatMessageRow
                      message={message}
                      previous={previous}
                      mine={mine}
                      currentUserId={currentUserId}
                      starred={starredMessageIds.has(message.id)}
                      dateDividerLabel={dateDividerLabel}
                      reducedMotion={!!reducedMotion}
                      onRetry={handleRetryMessage}
                      onEdit={handleEditMessage}
                      onDeleteRequest={handleDeleteMessageRequest}
                      onReact={handleReactMessage}
                      onReply={handleReplyMessage}
                      onShare={handleShareMessage}
                      onCopy={handleCopyMessage}
                      onToggleStar={handleToggleStarMessage}
                      searchTerm={messageSearch}
                      activeSearchMatch={
                        activeMessageSearchMatch?.messageId === message.id
                      }
                    />
                  </div>
                );
              })}
            </div>

            {remoteTypingUsers.length ? (
              <div className="mt-4 flex justify-start pb-4">
                <div className="rounded-[18px] rounded-bl-md border border-[var(--fc-app-border)] bg-[var(--fc-their-bubble)] px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        style={{
                          animationDelay: `${dot * 130}ms`,
                          animationDuration: "720ms",
                        }}
                        className={`h-2 w-2 rounded-full bg-[var(--fc-primary)] ${
                          reducedMotion ? "" : "animate-bounce"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} className="h-2" />
          </>
        )}
      </div>

      <div
        ref={composerRef}
        style={{
          paddingBottom:
            "calc(8px + env(safe-area-inset-bottom) + env(keyboard-inset-height, 0px))",
        }}
        className="absolute bottom-0 left-0 z-20 w-full px-3 pt-2"
      >
        <div className="fc-gpu-accelerated flex flex-col overflow-hidden rounded-[24px] border border-white/5 bg-[#16161D] shadow-[0_12px_48px_rgba(0,0,0,0.6)] backdrop-blur-3xl transition-colors duration-200 focus-within:bg-[#1E1E27] focus-within:border-[#7C4FF0]/30">
          {replyingTo ? (
            <div className="flex items-center gap-3 border-b border-white/5 bg-white/[0.03] p-3 text-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-black/20 text-[#7C4FF0]">
                <Reply size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C4FF0]">
                  Replying
                </p>
                <p className="truncate text-xs text-white/80">
                  {getMessagePreviewText(replyingTo)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/5 transition hover:bg-white/5"
                aria-label="Cancel reply"
              >
                <X size={15} className="text-white/70" />
              </button>
            </div>
          ) : null}

          {failedAttachmentUpload ? (
            <div className="flex items-center gap-3 border-b border-red-500/10 bg-red-500/[0.08] p-3 text-sm text-red-100">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/10 bg-black/20">
                <AlertCircle size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold">Upload failed</p>
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/5 transition disabled:cursor-wait disabled:opacity-60 hover:bg-white/5"
                aria-label="Retry attachment upload"
              >
                <RefreshCw size={15} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setFailedAttachmentUpload(null)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/5 transition hover:bg-white/5"
                aria-label="Dismiss upload error"
              >
                <X size={15} />
              </button>
            </div>
          ) : null}

          <div className="relative flex items-end gap-1 px-1.5 py-1.5">
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

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAttachment || isConversationBlocked}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:text-white hover:bg-white/5 disabled:cursor-wait disabled:opacity-70"
              aria-label="Upload attachment"
            >
              <Paperclip
                size={21}
                className={
                  isUploadingAttachment
                    ? "animate-pulse text-[#7C4FF0]"
                    : undefined
                }
              />
              {isUploadingAttachment ? (
                <span className="absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-[#7C4FF0] transition-[width]"
                    style={{
                      width: `${attachmentUploadProgress}%`,
                    }}
                  />
                </span>
              ) : null}
            </button>

            <div className="min-w-0 flex-1 px-1">
              {isRecordingVoice ? (
                <div className="flex min-h-[44px] items-center gap-3 py-1">
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
                        className="w-1 rounded-full bg-[#7C4FF0]"
                      />
                    ))}
                  </div>

                  <span className="shrink-0 text-xs font-bold text-[#7C4FF0]">
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
                      : "Message..."
                  }
                  disabled={isConversationBlocked}
                  className="max-h-40 min-h-[44px] w-full resize-none overflow-y-auto border-0 bg-transparent py-3 text-[15px] leading-tight text-white shadow-none outline-none ring-0 placeholder:text-white/30 focus:border-0 focus:outline-none focus:ring-0 focus-visible:shadow-none disabled:cursor-not-allowed"
                />
              )}
            </div>

            <button
              type="button"
              onClick={toggleEmojiPanel}
              disabled={isConversationBlocked}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:text-white hover:bg-white/5 ${
                emojiOpen
                  ? "text-[#7C4FF0] bg-white/5"
                  : "text-white/40"
              }`}
              aria-label={emojiOpen ? "Close emoji picker" : "Open emoji picker"}
              aria-expanded={emojiOpen}
            >
              <SmilePlus size={21} />
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
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                text.trim()
                  ? "bg-[#7C4FF0] shadow-lg shadow-[rgba(124,79,240,0.3)]"
                : isRecordingVoice
                    ? "bg-red-500 shadow-lg shadow-red-500/20"
                    : "text-[#7C4FF0] bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
              aria-label={
                text.trim() ? "Send message" : "Hold to record voice note"
              }
            >
              {text.trim() ? <SendHorizonal size={20} /> : <Mic size={20} />}
            </button>
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
                  height="100%"
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
            className="fixed inset-0 z-[268] flex items-end justify-center bg-[var(--fc-overlay)] p-3 sm:items-center sm:p-6 sm:backdrop-blur-xl"
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
            className="fixed inset-0 z-[269] flex items-end justify-center bg-[var(--fc-overlay)] p-3 sm:items-center sm:p-6 sm:backdrop-blur-xl"
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
                      <ThemeOptionCard
                        key={theme.id}
                        theme={theme}
                        selected={selected}
                        applyingForMe={applyingForMe}
                        applyingForBoth={applyingForBoth}
                        disabled={!!themeApplying}
                        onApply={handleApplyTheme}
                      />
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
            className="fixed inset-0 z-[274] flex items-end justify-center bg-[var(--fc-overlay)] p-3 sm:items-center sm:p-6 sm:backdrop-blur-xl"
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
                  className="fc-surface absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border sm:backdrop-blur-xl"
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
                  {connectionStatusLabel}
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
                        : `${profileMemberItems.length} members`}
                    </p>
                  </div>
                </div>

                {profileMemberItems.length ? (
                  <div className="fc-surface rounded-2xl border p-3">
                    <p className="fc-subtle mb-2 px-1 text-xs font-medium">
                      Members
                    </p>
                    <div className="space-y-2">
                      {profileMemberItems.map((member) => (
                        <ProfileMemberRow key={member.id} member={member} />
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
            className="fixed inset-0 z-[276] flex items-center justify-center bg-[var(--fc-overlay-strong)] p-5 sm:backdrop-blur-xl"
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
            className="fixed inset-0 z-[272] flex items-end justify-center bg-[var(--fc-overlay)] p-3 sm:items-center sm:p-6 sm:backdrop-blur-xl"
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

                    return (
                      <ForwardConversationRow
                        key={conversation.id}
                        conversation={conversation}
                        selected={selected}
                        disabled={isForwarding}
                        onToggle={toggleForwardTarget}
                      />
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
        {deleteTargetMessage ? (
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
            className="fixed inset-0 z-[273] flex items-center justify-center bg-[var(--fc-overlay-strong)] p-4 sm:backdrop-blur-xl"
            onClick={() => {
              if (!isDeletingMessage) {
                setDeleteTargetMessage(null);
              }
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 18,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 18,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="fc-modal w-full max-w-sm rounded-2xl border p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-lg font-semibold">
                Delete Message?
              </h2>

              <div className="mt-5 space-y-3">
                {deleteTargetCanDeleteForEveryone ? (
                  <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm text-[var(--fc-theme-text)]">
                    <input
                      type="checkbox"
                      checked={deleteForEveryone}
                      onChange={(event) => {
                        setDeleteForEveryone(
                          event.target.checked,
                        );
                        if (event.target.checked) {
                          setDeleteForMe(true);
                        }
                      }}
                      disabled={isDeletingMessage}
                      className="h-4 w-4 accent-red-500"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      Delete for {activeConversationDisplayName}
                    </span>
                  </label>
                ) : null}

                <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm text-[var(--fc-theme-text)]">
                  <input
                    type="checkbox"
                    checked={deleteForMe}
                    onChange={(event) =>
                      setDeleteForMe(event.target.checked)
                    }
                    disabled={
                      isDeletingMessage ||
                      deleteForEveryone
                    }
                    className="h-4 w-4 accent-red-500"
                  />
                  <span>Delete for me</span>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTargetMessage(null)}
                  disabled={isDeletingMessage}
                  className="fc-surface fc-hover h-11 rounded-2xl border px-5 text-sm font-medium text-[var(--fc-text-muted)] transition hover:text-[var(--fc-theme-text)] disabled:cursor-wait disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleConfirmDeleteMessage();
                  }}
                  disabled={
                    isDeletingMessage ||
                    (!deleteForMe && !deleteForEveryone)
                  }
                  className="h-11 rounded-2xl bg-red-500 px-5 text-sm font-semibold text-white shadow-xl shadow-red-500/25 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete
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
            className="fixed inset-0 z-[275] flex items-end justify-center bg-[var(--fc-overlay)] p-3 sm:items-center sm:p-6 sm:backdrop-blur-xl"
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
            className="fixed inset-0 z-[270] flex items-end justify-center bg-[var(--fc-overlay)] p-3 sm:items-center sm:p-6 sm:backdrop-blur-xl"
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
              className="fc-modal w-full max-w-md overflow-hidden rounded-[24px] border sm:backdrop-blur-3xl"
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
                    <AiSuggestionButton
                      key={suggestion}
                      suggestion={suggestion}
                      onSelect={handleAiSuggestionSelect}
                    />
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
