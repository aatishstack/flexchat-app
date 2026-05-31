"use client";
import { generateId } from "@/lib/uuid";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlertCircle,
  BellOff,
  Check,
  Eye,
  Image as ImageIcon,
  Loader2,
  Palette,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Smile,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type {
  PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useStoriesQuery } from "@/hooks/queries/use-stories-query";
import FlexAvatar from "@/components/chat/flex-avatar";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/lib/user-display";
import { createStory } from "@/services/story.service";
import {
  getUploadValidationError,
  uploadImage,
} from "@/services/upload.service";
import { useToastStore } from "@/store/toast-store";
import { useThemeStore } from "@/store/theme-store";
import { useAuthStore } from "@/stores/auth.store";
import { getServerNow } from "@/lib/server-time";
import type { Story } from "@/types/story";

import StoryViewer from "./story-viewer";

type StoryGroup = {
  userId: string;
  user: Story["user"];
  stories: Story[];
  hasUnseen: boolean;
};

type StoryUploadInput = {
  file?: File;
  optimisticId: string;
  previewUrl?: string;
  mediaType: "image" | "video" | "text";
  caption: string;
};

type FailedStoryUpload = {
  file?: File;
  mediaType: "image" | "video" | "text";
  caption: string;
  message: string;
  previewUrl?: string;
};

type StoryTextOverlay = {
  text: string;
  x: number;
  y: number;
  color: string;
  align: "left" | "center" | "right";
  highlight: boolean;
  fontSize: number;
  fontFamily: "Inter" | "Georgia" | "Impact";
};

type StorySticker = {
  label: string;
  x: number;
  y: number;
  size: number;
};

type StoryDrawPoint = {
  x: number;
  y: number;
};

type StoryDrawStroke = {
  color: string;
  points: StoryDrawPoint[];
};

type DraftElementKind = "text" | "sticker" | "draw";

type StoryDraft = {
  file?: File;
  previewUrl?: string;
  mediaType: "image" | "video" | "text";
  caption: string;
  textOverlay?: StoryTextOverlay;
  backgroundColor?: string;
  sticker?: StorySticker;
  drawStrokes?: StoryDrawStroke[];
  drawingMode?: boolean;
  videoDuration?: number;
  trimStart?: number;
  trimEnd?: number;
};

const TEXT_STORY_MEDIA_URL = "flexchat://story/text";
const MUTED_STORY_USERS_KEY = "flexchat:muted-story-users";
const FALLBACK_STORY_TEXT_COLORS = ["#ffffff", "#dff3ff", "#8ecfff", "#f8a4c5", "#c7d2fe"];
const FALLBACK_STORY_BACKGROUND_COLORS = ["#285ccc", "#2481cc", "#07111b", "#12385c", "#0b1724"];
const STORY_STICKERS = ["WOW", "YES", "LIVE", "MOOD", "FLEX"];
const STORY_IMAGE_EXTENSIONS = ["avif", "gif", "heic", "heif", "jpg", "jpeg", "png", "webp"];
const STORY_VIDEO_EXTENSIONS = ["mov", "mp4", "m4v", "3gp", "3gpp", "3g2", "3gpp2", "webm"];
const STORY_TOOL_BUTTON_CLASS =
  "fc-telegram-touch flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white backdrop-blur-xl transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45";

const DEFAULT_STORY_TEXT_OVERLAY: StoryTextOverlay = {
  text: "Tap to edit",
  x: 50,
  y: 50,
  color: "#ffffff",
  align: "center",
  highlight: true,
  fontSize: 34,
  fontFamily: "Inter",
};

function readThemeValue(token: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();

  return value || fallback;
}

function getStoryTextColors() {
  return [
    "#ffffff",
    readThemeValue("--fc-accent", FALLBACK_STORY_TEXT_COLORS[1]),
    readThemeValue("--fc-accent-text", FALLBACK_STORY_TEXT_COLORS[2]),
    "#fb7185",
    "#34d399",
  ];
}

function getStoryBackgroundColors() {
  return [
    readThemeValue("--fc-primary", FALLBACK_STORY_BACKGROUND_COLORS[0]),
    readThemeValue("--fc-accent", FALLBACK_STORY_BACKGROUND_COLORS[1]),
    readThemeValue("--flexchat-bg", FALLBACK_STORY_BACKGROUND_COLORS[2]),
    "#0f766e",
    "#7f1d1d",
  ];
}

function readMutedStoryUserIds() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const stored = window.localStorage.getItem(MUTED_STORY_USERS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    if (Array.isArray(parsed)) {
      return new Set(
        parsed.filter((item): item is string => typeof item === "string"),
      );
    }
  } catch {
    return new Set<string>();
  }

  return new Set<string>();
}

function groupStories(stories: Story[], currentUserId: string | undefined, now: number) {
  const groups = new Map<string, StoryGroup>();

  [...stories]
    .filter(
      (story) =>
        new Date(story.expiresAt).getTime() > now
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    )
    .forEach((story) => {
      const existing = groups.get(story.userId);

      if (existing) {
        existing.stories.push(story);
        existing.hasUnseen =
          existing.hasUnseen ||
          (!story.viewed && story.userId !== currentUserId);
        return;
      }

      groups.set(story.userId, {
        userId: story.userId,
        user: story.user,
        stories: [story],
        hasUnseen: !story.viewed && story.userId !== currentUserId,
      });
    });

  return Array.from(groups.values()).sort((left, right) => {
    if (left.userId === currentUserId) {
      return -1;
    }

    if (right.userId === currentUserId) {
      return 1;
    }

    const leftTime = new Date(
      left.stories[left.stories.length - 1]?.createdAt ?? 0,
    ).getTime();
    const rightTime = new Date(
      right.stories[right.stories.length - 1]?.createdAt ?? 0,
    ).getTime();

    return rightTime - leftTime;
  });
}

function getVideoDurationSeconds(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;

      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video metadata unavailable"));
    };
    video.src = url;
  });
}

function getStoryFileKind(file: File): "image" | "video" | null {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (
    file.type.startsWith("video/") ||
    STORY_VIDEO_EXTENSIONS.includes(extension ?? "")
  ) {
    return "video";
  }

  if (
    file.type.startsWith("image/") ||
    STORY_IMAGE_EXTENSIONS.includes(extension ?? "")
  ) {
    return "image";
  }

  return null;
}

function getStoryMediaType(file: File): "image" | "video" {
  return getStoryFileKind(file) ?? "image";
}

function getStoryValidationError(file: File) {
  if (!getStoryFileKind(file)) {
    return "Choose a supported story photo or video.";
  }

  return getUploadValidationError(file);
}

function loadImageFile(file: File) {
  return new Promise<{
    image: HTMLImageElement;
    url: string;
  }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Story image could not be prepared."));
    };
    image.src = url;
  });
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];

  text.split(/\n/).forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      return;
    }

    let line = "";

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;

      if (context.measureText(nextLine).width <= maxWidth || !line) {
        line = nextLine;
        return;
      }

      lines.push(line);
      line = word;
    });

    lines.push(line);
  });

  return lines.slice(0, 8);
}

function drawStoryText(
  context: CanvasRenderingContext2D,
  overlay: StoryTextOverlay | undefined,
  width: number,
  height: number,
) {
  const text = overlay?.text.trim();

  if (!overlay || !text) {
    return;
  }

  const fontSize = Math.round(
    Math.max(22, Math.min(112, overlay.fontSize * (width / 390))),
  );
  const lineHeight = fontSize * 1.22;
  const maxTextWidth = width * 0.78;
  const x = (overlay.x / 100) * width;
  const y = (overlay.y / 100) * height;

  context.save();
  context.font = `700 ${fontSize}px ${overlay.fontFamily}, Arial, sans-serif`;
  context.textAlign = overlay.align;
  context.textBaseline = "alphabetic";

  const lines = wrapCanvasText(context, text, maxTextWidth);
  const blockWidth = Math.min(
    maxTextWidth,
    Math.max(...lines.map((line) => context.measureText(line).width), fontSize),
  );
  const blockHeight = lines.length * lineHeight;
  const blockX =
    overlay.align === "left"
      ? x
      : overlay.align === "right"
        ? x - blockWidth
        : x - blockWidth / 2;
  const blockY = y - blockHeight / 2;

  if (overlay.highlight) {
    const paddingX = fontSize * 0.42;
    const paddingY = fontSize * 0.28;

    context.fillStyle = "rgba(0, 0, 0, 0.46)";
    context.beginPath();
    context.roundRect(
      blockX - paddingX,
      blockY - paddingY,
      blockWidth + paddingX * 2,
      blockHeight + paddingY * 2,
      fontSize * 0.38,
    );
    context.fill();
  }

  context.fillStyle = overlay.color;
  context.shadowColor = "rgba(0,0,0,0.45)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 2;

  lines.forEach((line, index) => {
    context.fillText(line, x, blockY + fontSize + index * lineHeight, maxTextWidth);
  });
  context.restore();
}

function drawStorySticker(
  context: CanvasRenderingContext2D,
  sticker: StorySticker | undefined,
  width: number,
  height: number,
) {
  if (!sticker) {
    return;
  }

  const fontSize = Math.round(sticker.size * (width / 390));
  const x = (sticker.x / 100) * width;
  const y = (sticker.y / 100) * height;

  context.save();
  context.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0,0,0,0.38)";
  context.shadowBlur = 14;
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.strokeStyle = "rgba(0,0,0,0.18)";
  context.lineWidth = Math.max(3, fontSize * 0.08);
  context.strokeText(sticker.label, x, y);
  context.fillText(sticker.label, x, y);
  context.restore();
}

function drawStoryStrokes(
  context: CanvasRenderingContext2D,
  strokes: StoryDrawStroke[] | undefined,
  width: number,
  height: number,
) {
  if (!strokes?.length) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(7, width * 0.012);

  strokes.forEach((stroke) => {
    if (stroke.points.length < 2) {
      return;
    }

    context.beginPath();
    context.strokeStyle = stroke.color;
    stroke.points.forEach((point, index) => {
      const x = (point.x / 100) * width;
      const y = (point.y / 100) * height;

      if (index === 0) {
        context.moveTo(x, y);
        return;
      }

      context.lineTo(x, y);
    });
    context.stroke();
  });
  context.restore();
}

async function canvasToStoryFile(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("Story image export failed."));
      },
      "image/png",
      0.96,
    );
  });

  return new File([blob], filename, {
    type: "image/png",
    lastModified: getServerNow(),
  });
}

async function bakeStoryTextOverlay(
  file: File,
  overlay?: StoryTextOverlay,
  sticker?: StorySticker,
  drawStrokes?: StoryDrawStroke[],
) {
  if (!overlay?.text.trim() && !sticker && !drawStrokes?.length) {
    return file;
  }

  const { image, url } = await loadImageFile(file);

  try {
    const canvas = document.createElement("canvas");
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");

    if (!width || !height || !context) {
      throw new Error("Story image could not be edited.");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);
    drawStoryStrokes(context, drawStrokes, width, height);
    drawStorySticker(context, sticker, width, height);
    drawStoryText(context, overlay, width, height);

    return canvasToStoryFile(
      canvas,
      `${file.name.replace(/\.[^.]+$/, "") || "story"}.png`,
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderTextStoryFile(
  draft: StoryDraft,
  storyBackgroundColors: string[],
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Text story could not be prepared.");
  }

  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, draft.backgroundColor ?? storyBackgroundColors[0]);
  gradient.addColorStop(1, "#020617");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  drawStoryStrokes(context, draft.drawStrokes, width, height);
  drawStorySticker(context, draft.sticker, width, height);
  drawStoryText(context, draft.textOverlay, width, height);

  return canvasToStoryFile(canvas, `text-story-${generateId()}.png`);
}

function formatStoryTrimTime(value = 0) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getSupportedStoryRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return (
    [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? ""
  );
}

async function waitForVideoSeek(video: HTMLVideoElement, time: number) {
  await new Promise<void>((resolve, reject) => {
    let settled = false;

    function cleanup() {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      window.clearTimeout(fallbackTimer);
    }

    function finish() {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    }

    function handleSeeked() {
      finish();
    }

    function handleError() {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error("Video trim preview could not seek."));
    }

    const fallbackTimer = window.setTimeout(finish, 500);

    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    video.currentTime = time;

    if (Math.abs(video.currentTime - time) < 0.05) {
      finish();
    }
  });
}

async function trimStoryVideoFile(
  file: File,
  startSeconds: number,
  endSeconds: number,
  onProgress?: (progress: number) => void,
) {
  if (
    typeof document === "undefined" ||
    typeof MediaRecorder === "undefined"
  ) {
    throw new Error("This browser cannot trim videos.");
  }

  const mimeType = getSupportedStoryRecordingMimeType();

  if (!mimeType) {
    throw new Error("This browser cannot trim videos.");
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");

  video.preload = "auto";
  video.playsInline = true;
  video.muted = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video metadata unavailable."));
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const start = Math.max(0, Math.min(startSeconds, Math.max(duration - 1, 0)));
    const end = Math.max(start + 1, Math.min(endSeconds, duration || endSeconds));
    const sourceWidth = video.videoWidth || 720;
    const sourceHeight = video.videoHeight || 1280;
    const maxHeight = 1280;
    const scale = Math.min(1, maxHeight / sourceHeight);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Video trim unavailable.");
    }
    const renderingContext = context;

    canvas.width = Math.max(2, Math.round(sourceWidth * scale));
    canvas.height = Math.max(2, Math.round(sourceHeight * scale));

    const canvasStream = canvas.captureStream(24);
    const mediaElementStream =
      (
        video as HTMLVideoElement & {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        }
      ).captureStream?.() ??
      (
        video as HTMLVideoElement & {
          mozCaptureStream?: () => MediaStream;
        }
      ).mozCaptureStream?.();

    mediaElementStream?.getAudioTracks().forEach((track) => {
      canvasStream.addTrack(track);
    });

    await waitForVideoSeek(video, start);

    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 2_400_000,
      audioBitsPerSecond: 96_000,
    });
    const chunks: BlobPart[] = [];
    let frameId = 0;
    let stopTimer = 0;

    function stopRecording() {
      window.clearTimeout(stopTimer);
      cancelAnimationFrame(frameId);
      video.pause();

      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }

    function drawFrame() {
      if (video.currentTime >= end || video.ended) {
        stopRecording();
        return;
      }

      renderingContext.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(
        Math.min(
          90,
          Math.max(8, Math.round(((video.currentTime - start) / (end - start)) * 82)),
        ),
      );
      frameId = requestAnimationFrame(drawFrame);
    }

    stopTimer = window.setTimeout(
      stopRecording,
      Math.ceil((end - start) * 1000) + 700,
    );

    const trimmedBlob = await new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = () => reject(new Error("Video trim failed."));
      recorder.onstop = () =>
        resolve(
          new Blob(chunks, {
            type: "video/webm",
          }),
        );

      recorder.start(500);
      frameId = requestAnimationFrame(drawFrame);
      void video.play().catch(reject);
    });

    canvasStream.getTracks().forEach((track) => {
      track.stop();
    });

    onProgress?.(92);

    return new File(
      [trimmedBlob],
      `${file.name.replace(/\.[^.]+$/, "") || "story"}-trimmed.webm`,
      {
        type: "video/webm",
        lastModified: Date.now(),
      },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function StoryTray() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storyCanvasRef = useRef<HTMLDivElement | null>(null);
  const deleteZoneRef = useRef<HTMLDivElement | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const dragHoldTimerRef = useRef<number | null>(null);
  const deleteHoverRef = useRef(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [viewerGroupSource, setViewerGroupSource] =
    useState<"visible" | "muted">("visible");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storyPreparing, setStoryPreparing] = useState(false);
  const [failedStoryUpload, setFailedStoryUpload] =
    useState<FailedStoryUpload | null>(null);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyDraft, setStoryDraft] =
    useState<StoryDraft | null>(null);
  const [textOverlayEditorOpen, setTextOverlayEditorOpen] = useState(false);
  const [overlayDragging, setOverlayDragging] = useState(false);
  const [stickerDragging, setStickerDragging] = useState(false);
  const [selectedDraftElement, setSelectedDraftElement] =
    useState<DraftElementKind | null>(null);
  const [dragDeleteState, setDragDeleteState] = useState<{
    kind: DraftElementKind;
    active: boolean;
    overDelete: boolean;
  } | null>(null);
  const [mutedStoryUserIds, setMutedStoryUserIds] = useState<Set<string>>(
    readMutedStoryUserIds,
  );
  const [mutedStoriesOpen, setMutedStoriesOpen] = useState(false);
  const [expiryCheckAt, setExpiryCheckAt] =
    useState(0);
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const storyErrorShownRef = useRef(false);
  const failedStoryUploadRef = useRef<FailedStoryUpload | null>(null);
  const storyDraftRef = useRef<StoryDraft | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const pushToast = useToastStore((state) => state.pushToast);
  const themeId = useThemeStore((state) => state.themeId);
  const storiesQuery = useStoriesQuery();
  const storyTextColors = useMemo(() => {
    void themeId;

    return getStoryTextColors();
  }, [themeId]);
  const storyBackgroundColors = useMemo(
    () => {
      void themeId;

      return getStoryBackgroundColors();
    },
    [themeId],
  );

  const allStoryGroups = useMemo(
    () =>
      groupStories(
        storiesQuery.data ?? [],
        currentUserId,
        Math.max(expiryCheckAt, getServerNow()),
      ),
    [currentUserId, expiryCheckAt, storiesQuery.data],
  );

  const storyGroups = useMemo(
    () =>
      allStoryGroups.filter(
        (group) =>
          group.userId === currentUserId ||
          !mutedStoryUserIds.has(group.userId),
      ),
    [allStoryGroups, currentUserId, mutedStoryUserIds],
  );

  const currentUserStoryGroupIndex = useMemo(
    () =>
      storyGroups.findIndex((group) => group.userId === currentUserId),
    [currentUserId, storyGroups],
  );
  const currentUserStoryGroup =
    currentUserStoryGroupIndex >= 0
      ? storyGroups[currentUserStoryGroupIndex]
      : null;
  const visibleStoryGroups = useMemo(
    () => storyGroups.filter((group) => group.userId !== currentUserId),
    [currentUserId, storyGroups],
  );
  const mutedStoryGroups = useMemo(
    () =>
      allStoryGroups.filter(
        (group) =>
          group.userId !== currentUserId &&
          mutedStoryUserIds.has(group.userId),
      ),
    [allStoryGroups, currentUserId, mutedStoryUserIds],
  );

  useEffect(() => {
    const now = getServerNow();
    const nextExpiry = (storiesQuery.data ?? [])
      .map((story) =>
        new Date(story.expiresAt).getTime()
      )
      .filter((expiresAt) => expiresAt > now)
      .sort((left, right) => left - right)[0];

    if (!nextExpiry) {
      return;
    }

    const timer = window.setTimeout(
      () => setExpiryCheckAt(getServerNow()),
      Math.min(
        nextExpiry - now + 50,
        2_147_483_647,
      ),
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    expiryCheckAt,
    storiesQuery.data,
  ]);

  const createStoryMutation = useMutation({
    mutationFn: async ({ file, mediaType, caption }: StoryUploadInput) => {
      if (!currentUser) {
        throw new Error("Please sign in again before publishing a story.");
      }

      if (mediaType === "text") {
        const text = caption.trim();

        if (!text) {
          throw new Error("Write something before publishing a text story.");
        }

        setUploadProgress(94);

        return createStory({
          mediaUrl: TEXT_STORY_MEDIA_URL,
          mediaType: "text",
          caption: text,
        });
      }

      if (!file) {
        throw new Error("Choose a story photo or video first.");
      }

      const validationError = getStoryValidationError(file);

      if (validationError) {
        throw new Error(validationError);
      }

      if (mediaType === "video") {
        const duration = await getVideoDurationSeconds(file).catch(
          () => null,
        );

        if (
          typeof duration === "number" &&
          Number.isFinite(duration) &&
          duration > 30
        ) {
          throw new Error("Story videos must be 30 seconds or shorter.");
        }
      }

      const mediaUrl = await uploadImage(file, {
        onProgress: (progress) => {
          setUploadProgress(Math.min(88, Math.max(8, progress)));
        },
      });
      setUploadProgress(94);

      return createStory({
        mediaUrl,
        mediaType,
        caption: caption.trim() || undefined,
      });
    },
    onMutate: ({ optimisticId, previewUrl, caption, mediaType }) => {
      setUploadProgress(4);
      setFailedStoryUpload(null);

      if (!currentUser) {
        return {
          optimisticId,
          previewUrl,
        };
      }

      const optimisticStory: Story = {
        id: optimisticId,
        userId: currentUser.id,
        mediaUrl: previewUrl ?? TEXT_STORY_MEDIA_URL,
        mediaType,
        caption: caption.trim(),
        createdAt: new Date(getServerNow()).toISOString(),
        expiresAt: new Date(getServerNow() + 24 * 60 * 60 * 1000).toISOString(),
        viewed: true,
        viewCount: 0,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar ?? null,
        },
      };

      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (currentStories) => [
          optimisticStory,
          ...(currentStories ?? []).filter(
            (story) => story.id !== optimisticId,
          ),
        ],
      );

      return {
        optimisticId,
        previewUrl,
      };
    },
    onSuccess: (story, _variables, context) => {
      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (currentStories) => {
          const filteredStories = (currentStories ?? []).filter(
            (item) => item.id !== story.id && item.id !== context?.optimisticId,
          );

          return [story, ...filteredStories];
        },
      );
      setUploadProgress(100);
      if (context?.previewUrl) {
        URL.revokeObjectURL(context.previewUrl);
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stories.all,
      });
      pushToast({
        title: "Story published",
        message: "Your story is now live for your conversations.",
        variant: "success",
      });
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (currentStories) =>
          (currentStories ?? []).filter(
            (story) => story.id !== context?.optimisticId,
          ),
      );
      setFailedStoryUpload({
        file: variables.file,
        mediaType: variables.mediaType,
        caption: variables.caption,
        previewUrl: variables.previewUrl,
        message:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
      });
      pushToast({
        title: "Couldn't upload story",
        message:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "error",
      });
    },
    onSettled: () => {
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  useEffect(() => {
    failedStoryUploadRef.current = failedStoryUpload;
  }, [failedStoryUpload]);

  useEffect(() => {
    storyDraftRef.current = storyDraft;
  }, [storyDraft]);

  useEffect(() => {
    return () => {
      clearDragHoldTimer();

      if (failedStoryUploadRef.current?.previewUrl) {
        URL.revokeObjectURL(failedStoryUploadRef.current.previewUrl);
      }

      if (storyDraftRef.current?.previewUrl) {
        URL.revokeObjectURL(storyDraftRef.current.previewUrl);
      }
    };
  }, []);

  function openStoryPreview(file: File) {
    if (!currentUser) {
      pushToast({
        title: "Sign in required",
        message: "Please sign in again before publishing a story.",
        variant: "error",
      });
      return;
    }

    const validationError = getStoryValidationError(file);

    if (validationError) {
      pushToast({
        title: "Story media unavailable",
        message: validationError,
        variant: "warning",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const mediaType = getStoryMediaType(file);

    setTextOverlayEditorOpen(false);
    setOverlayDragging(false);
    setStickerDragging(false);
    setSelectedDraftElement(null);
    clearDragHoldTimer();
    deleteHoverRef.current = false;
    drawingPointerIdRef.current = null;
    setDragDeleteState(null);

    if (failedStoryUpload?.previewUrl) {
      URL.revokeObjectURL(failedStoryUpload.previewUrl);
      setFailedStoryUpload(null);
    }

    setStoryDraft((currentDraft) => {
      if (currentDraft?.previewUrl) {
        URL.revokeObjectURL(currentDraft.previewUrl);
      }

      return {
        file,
        previewUrl,
        mediaType,
        caption: "",
        trimStart: mediaType === "video" ? 0 : undefined,
      };
    });

    if (mediaType === "video") {
      void getVideoDurationSeconds(file)
        .then((duration) => {
          setStoryDraft((draft) => {
            if (!draft || draft.previewUrl !== previewUrl) {
              return draft;
            }

            const safeDuration = Number.isFinite(duration)
              ? Math.max(0, duration)
              : 0;

            return {
              ...draft,
              videoDuration: safeDuration,
              trimStart: 0,
              trimEnd: Math.min(safeDuration || 30, 30),
            };
          });
        })
        .catch(() => {
          setStoryDraft((draft) =>
            draft && draft.previewUrl === previewUrl
              ? {
                  ...draft,
                  videoDuration: undefined,
                  trimStart: 0,
                  trimEnd: 30,
                }
              : draft,
          );
        });
    }
  }

  function openStoryComposer() {
    setStoryComposerOpen(true);
  }

  function chooseMediaStory() {
    setStoryComposerOpen(false);
    fileInputRef.current?.click();
  }

  function openTextStoryDraft() {
    if (!currentUser) {
      pushToast({
        title: "Sign in required",
        message: "Please sign in again before publishing a story.",
        variant: "error",
      });
      return;
    }

    if (failedStoryUpload?.previewUrl) {
      URL.revokeObjectURL(failedStoryUpload.previewUrl);
      setFailedStoryUpload(null);
    }

    setTextOverlayEditorOpen(true);
    setOverlayDragging(false);
    setStickerDragging(false);
    setSelectedDraftElement("text");
    clearDragHoldTimer();
    deleteHoverRef.current = false;
    drawingPointerIdRef.current = null;
    setDragDeleteState(null);
    setStoryComposerOpen(false);

    setStoryDraft((currentDraft) => {
      if (currentDraft?.previewUrl) {
        URL.revokeObjectURL(currentDraft.previewUrl);
      }

      return {
        mediaType: "text",
        caption: "",
        backgroundColor: storyBackgroundColors[0],
        textOverlay: {
          ...DEFAULT_STORY_TEXT_OVERLAY,
          text: "",
          highlight: false,
          fontSize: 38,
        },
      };
    });
  }

  function updateStoryTextOverlay(
    updater: (overlay: StoryTextOverlay) => StoryTextOverlay,
  ) {
    setStoryDraft((draft) => {
      if (!draft) {
        return draft;
      }

      return {
        ...draft,
        textOverlay: updater(draft.textOverlay ?? DEFAULT_STORY_TEXT_OVERLAY),
      };
    });
  }

  function openImageTextTool() {
    setTextOverlayEditorOpen(true);
    updateStoryTextOverlay((overlay) => overlay);
  }

  function moveStoryTextOverlay(clientX: number, clientY: number) {
    const bounds = storyCanvasRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    const x = Math.min(92, Math.max(8, ((clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(88, Math.max(12, ((clientY - bounds.top) / bounds.height) * 100));

    updateStoryTextOverlay((overlay) => ({
      ...overlay,
      x,
      y,
    }));
  }

  function updateStorySticker(
    updater: (sticker: StorySticker | undefined) => StorySticker | undefined,
  ) {
    setStoryDraft((draft) => {
      if (!draft) {
        return draft;
      }

      return {
        ...draft,
        sticker: updater(draft.sticker),
      };
    });
  }

  function moveStorySticker(clientX: number, clientY: number) {
    const bounds = storyCanvasRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    const x = Math.min(88, Math.max(12, ((clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(88, Math.max(12, ((clientY - bounds.top) / bounds.height) * 100));

    updateStorySticker((sticker) =>
      sticker
        ? {
            ...sticker,
            x,
            y,
          }
        : sticker,
    );
  }

  function clearDragHoldTimer() {
    if (!dragHoldTimerRef.current) {
      return;
    }

    window.clearTimeout(dragHoldTimerRef.current);
    dragHoldTimerRef.current = null;
  }

  function isInsideDeleteZone(clientX: number, clientY: number) {
    const zone = deleteZoneRef.current?.getBoundingClientRect();

    if (!zone) {
      return false;
    }

    const magneticPadding = 28;

    return (
      clientX >= zone.left - magneticPadding &&
      clientX <= zone.right + magneticPadding &&
      clientY >= zone.top - magneticPadding &&
      clientY <= zone.bottom + magneticPadding
    );
  }

  function vibrateDeleteHover() {
    if (deleteHoverRef.current) {
      return;
    }

    deleteHoverRef.current = true;
    navigator.vibrate?.(12);
  }

  function startDraftElementDrag(kind: DraftElementKind) {
    clearDragHoldTimer();
    deleteHoverRef.current = false;
    setSelectedDraftElement(kind);
    setDragDeleteState({
      kind,
      active: false,
      overDelete: false,
    });

    dragHoldTimerRef.current = window.setTimeout(() => {
      setDragDeleteState((current) =>
        current?.kind === kind
          ? {
              ...current,
              active: true,
            }
          : current,
      );
    }, 140);
  }

  function updateDraftElementDrag(
    kind: DraftElementKind,
    clientX: number,
    clientY: number,
  ) {
    setDragDeleteState((current) => {
      if (!current || current.kind !== kind) {
        return current;
      }

      const overDelete =
        current.active && isInsideDeleteZone(clientX, clientY);

      if (overDelete) {
        vibrateDeleteHover();
      } else {
        deleteHoverRef.current = false;
      }

      return {
        ...current,
        overDelete,
      };
    });
  }

  function deleteDraftElement(kind: DraftElementKind | null) {
    setStoryDraft((draft) => {
      if (!draft || !kind) {
        return draft;
      }

      if (kind === "sticker") {
        return {
          ...draft,
          sticker: undefined,
        };
      }

      if (kind === "draw") {
        return {
          ...draft,
          drawStrokes: undefined,
          drawingMode: false,
        };
      }

      return {
        ...draft,
        textOverlay: undefined,
      };
    });
    setTextOverlayEditorOpen(false);
    setSelectedDraftElement(null);
  }

  function updateVideoTrimStart(value: number) {
    setStoryDraft((draft) => {
      if (!draft || draft.mediaType !== "video") {
        return draft;
      }

      const duration = Math.max(1, draft.videoDuration ?? 30);
      const start = Math.max(0, Math.min(value, duration - 1));
      const currentEnd = draft.trimEnd ?? Math.min(duration, start + 30);
      const end = Math.min(
        duration,
        Math.max(start + 1, Math.min(currentEnd, start + 30)),
      );

      return {
        ...draft,
        trimStart: start,
        trimEnd: end,
      };
    });
  }

  function updateVideoTrimEnd(value: number) {
    setStoryDraft((draft) => {
      if (!draft || draft.mediaType !== "video") {
        return draft;
      }

      const duration = Math.max(1, draft.videoDuration ?? 30);
      const start = Math.max(0, draft.trimStart ?? 0);
      const end = Math.max(
        start + 1,
        Math.min(duration, Math.min(value, start + 30)),
      );

      return {
        ...draft,
        trimStart: start,
        trimEnd: end,
      };
    });
  }

  function finishDraftElementDrag(
    kind: DraftElementKind,
    clientX: number,
    clientY: number,
  ) {
    clearDragHoldTimer();

    if (
      dragDeleteState?.kind === kind &&
      dragDeleteState.active &&
      isInsideDeleteZone(clientX, clientY)
    ) {
      deleteDraftElement(kind);
      navigator.vibrate?.([16, 20, 16]);
    }

    deleteHoverRef.current = false;
    setDragDeleteState(null);
  }

  function addOrCycleSticker() {
    setStoryDraft((draft) => {
      if (!draft || draft.mediaType === "video") {
        return draft;
      }

      const currentIndex = draft.sticker
        ? STORY_STICKERS.indexOf(draft.sticker.label)
        : -1;
      const label =
        STORY_STICKERS[(currentIndex + 1) % STORY_STICKERS.length] ??
        STORY_STICKERS[0];

      return {
        ...draft,
        sticker: {
          label,
          x: draft.sticker?.x ?? 50,
          y: draft.sticker?.y ?? 62,
          size: draft.sticker?.size ?? 34,
        },
      };
    });
    setSelectedDraftElement("sticker");
  }

  function toggleDrawingMode() {
    setStoryDraft((draft) => {
      if (!draft || draft.mediaType === "video") {
        return draft;
      }

      return {
        ...draft,
        drawingMode: !draft.drawingMode,
      };
    });
    setSelectedDraftElement("draw");
    setTextOverlayEditorOpen(false);
  }

  function getStoryCanvasPoint(clientX: number, clientY: number) {
    const bounds = storyCanvasRef.current?.getBoundingClientRect();

    if (!bounds) {
      return null;
    }

    return {
      x: Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - bounds.top) / bounds.height) * 100)),
    };
  }

  function startStoryDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    if (!storyDraft?.drawingMode) {
      return;
    }

    const point = getStoryCanvasPoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointerIdRef.current = event.pointerId;
    setSelectedDraftElement("draw");
    setStoryDraft((draft) =>
      draft
        ? {
            ...draft,
            drawStrokes: [
              ...(draft.drawStrokes ?? []),
              {
                color: draft.textOverlay?.color ?? "#ffffff",
                points: [point],
              },
            ],
          }
        : draft,
    );
  }

  function continueStoryDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !storyDraft?.drawingMode ||
      drawingPointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const point = getStoryCanvasPoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    setStoryDraft((draft) => {
      if (!draft?.drawStrokes?.length) {
        return draft;
      }

      const drawStrokes = [...draft.drawStrokes];
      const lastStroke = drawStrokes[drawStrokes.length - 1];

      drawStrokes[drawStrokes.length - 1] = {
        ...lastStroke,
        points: [...lastStroke.points, point],
      };

      return {
        ...draft,
        drawStrokes,
      };
    });
  }

  function endStoryDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    if (drawingPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    drawingPointerIdRef.current = null;
  }

  function deleteSelectedDraftElement() {
    setStoryDraft((draft) => {
      if (!draft) {
        return draft;
      }

      if (selectedDraftElement === "sticker") {
        return {
          ...draft,
          sticker: undefined,
        };
      }

      if (selectedDraftElement === "draw") {
        return {
          ...draft,
          drawStrokes: draft.drawStrokes?.slice(0, -1),
          drawingMode: false,
        };
      }

      return {
        ...draft,
        textOverlay: undefined,
      };
    });
    setTextOverlayEditorOpen(false);
    setSelectedDraftElement(null);
  }

  const publishStory = useCallback((draft: StoryDraft) => {
    createStoryMutation.mutate({
      file: draft.file,
      optimisticId: `optimistic-story-${generateId()}`,
      previewUrl: draft.previewUrl,
      mediaType: draft.mediaType,
      caption: draft.caption,
    });
  }, [createStoryMutation]);

  async function confirmStoryDraftUpload() {
    if (!storyDraft || createStoryMutation.isPending || storyPreparing) {
      return;
    }

    const draft = storyDraft;
    let uploadDraft = draft;

    setStoryPreparing(true);

    if (
      draft.mediaType === "text"
    ) {
      const text = draft.textOverlay?.text.trim();

      if (!text) {
        setStoryPreparing(false);
        pushToast({
          title: "Add story text",
          message: "Write something before sharing your story.",
          variant: "warning",
        });
        return;
      }

      try {
        const textStoryFile = await renderTextStoryFile(
          draft,
          storyBackgroundColors,
        );
        const textStoryPreviewUrl = URL.createObjectURL(textStoryFile);

        uploadDraft = {
          ...draft,
          file: textStoryFile,
          previewUrl: textStoryPreviewUrl,
          mediaType: "image",
          caption: "",
          textOverlay: undefined,
          sticker: undefined,
          drawStrokes: undefined,
          drawingMode: false,
        };
      } catch (error) {
        pushToast({
          title: "Text story could not be prepared",
          message:
            error instanceof Error
              ? error.message
              : "Please try again in a moment.",
          variant: "error",
        });
        setStoryPreparing(false);
        return;
      }
    }

    if (draft.mediaType === "video" && draft.file) {
      const duration = draft.videoDuration;
      const trimStart = Math.max(0, draft.trimStart ?? 0);
      const trimEnd = Math.max(
        trimStart + 1,
        draft.trimEnd ?? Math.min(duration ?? 30, 30),
      );
      const shouldTrim =
        (duration !== undefined && duration > 30) ||
        trimStart > 0.1 ||
        (duration !== undefined && trimEnd < duration - 0.1);

      if (duration !== undefined && trimEnd - trimStart > 30.1) {
        pushToast({
          title: "Trim story video",
          message: "Stories can be up to 30 seconds. Shorten the selected clip.",
          variant: "warning",
        });
        setStoryPreparing(false);
        return;
      }

      if (shouldTrim) {
        try {
          setUploadProgress(8);
          const trimmedFile = await trimStoryVideoFile(
            draft.file,
            trimStart,
            trimEnd,
            setUploadProgress,
          );
          const trimmedPreviewUrl = URL.createObjectURL(trimmedFile);

          if (draft.previewUrl) {
            URL.revokeObjectURL(draft.previewUrl);
          }

          uploadDraft = {
            ...draft,
            file: trimmedFile,
            previewUrl: trimmedPreviewUrl,
            videoDuration: trimEnd - trimStart,
            trimStart: 0,
            trimEnd: trimEnd - trimStart,
          };
        } catch (error) {
          pushToast({
            title: "Video trim failed",
            message:
              error instanceof Error
                ? error.message
                : "Please choose a video up to 30 seconds.",
            variant: "error",
          });
          setUploadProgress(0);
          setStoryPreparing(false);
          return;
        }
      }
    }

    if (
      draft.mediaType === "image" &&
      draft.file &&
      (draft.textOverlay?.text.trim() ||
        draft.sticker ||
        draft.drawStrokes?.length)
    ) {
      try {
        const bakedFile = await bakeStoryTextOverlay(
          draft.file,
          draft.textOverlay,
          draft.sticker,
          draft.drawStrokes,
        );
        const bakedPreviewUrl = URL.createObjectURL(bakedFile);

        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }

        uploadDraft = {
          ...draft,
          file: bakedFile,
          previewUrl: bakedPreviewUrl,
          textOverlay: undefined,
          sticker: undefined,
          drawStrokes: undefined,
          drawingMode: false,
        };
      } catch (error) {
        pushToast({
          title: "Story text could not be applied",
          message:
            error instanceof Error
              ? error.message
              : "Please try again in a moment.",
          variant: "error",
        });
        setStoryPreparing(false);
        return;
      }
    }

    setStoryDraft(null);
    setTextOverlayEditorOpen(false);
    setOverlayDragging(false);
    setStickerDragging(false);
    setSelectedDraftElement(null);
    clearDragHoldTimer();
    deleteHoverRef.current = false;
    drawingPointerIdRef.current = null;
    setDragDeleteState(null);
    setStoryPreparing(false);
    publishStory(uploadDraft);
  }

  function cancelStoryDraft() {
    if (storyDraft?.previewUrl) {
      URL.revokeObjectURL(storyDraft.previewUrl);
    }

    setStoryDraft(null);
    setTextOverlayEditorOpen(false);
    setOverlayDragging(false);
    setStickerDragging(false);
    setSelectedDraftElement(null);
    setStoryPreparing(false);
    clearDragHoldTimer();
    deleteHoverRef.current = false;
    drawingPointerIdRef.current = null;
    setDragDeleteState(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function clearFailedStoryUpload() {
    if (failedStoryUpload?.previewUrl) {
      URL.revokeObjectURL(failedStoryUpload.previewUrl);
    }

    setFailedStoryUpload(null);
  }

  function retryFailedStoryUpload() {
    const failed = failedStoryUpload;

    if (!failed) {
      return;
    }

    setFailedStoryUpload(null);
    failedStoryUploadRef.current = null;
    publishStory({
      file: failed.file,
      previewUrl: failed.previewUrl,
      mediaType: failed.mediaType,
      caption: failed.caption,
    });
  }

  useEffect(() => {
    function retryAfterReconnect() {
      const failed = failedStoryUploadRef.current;

      if (!failed || createStoryMutation.isPending) {
        return;
      }

      console.info("[SOCKET] retrying failed story upload after reconnect", {
        mediaType: failed.mediaType,
      });
      failedStoryUploadRef.current = null;
      setFailedStoryUpload(null);
      publishStory({
        file: failed.file,
        previewUrl: failed.previewUrl,
        mediaType: failed.mediaType,
        caption: failed.caption,
      });
    }

    window.addEventListener("online", retryAfterReconnect);

    return () => {
      window.removeEventListener("online", retryAfterReconnect);
    };
  }, [createStoryMutation.isPending, publishStory]);

  function muteStoryUser(userId: string) {
    setMutedStoryUserIds((current) => {
      const next = new Set(current);

      next.add(userId);

      try {
        window.localStorage.setItem(
          MUTED_STORY_USERS_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // Muting still applies for the current session.
      }

      return next;
    });

    setViewerGroupIndex(null);
    pushToast({
      title: "Story muted",
      message: "Stories from this person moved to Muted.",
      variant: "info",
    });
  }

  function unmuteStoryUser(userId: string) {
    setMutedStoryUserIds((current) => {
      const next = new Set(current);

      next.delete(userId);

      try {
        window.localStorage.setItem(
          MUTED_STORY_USERS_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // Unmuting still applies for the current session.
      }

      return next;
    });

    pushToast({
      title: "Story unmuted",
      message: "Stories from this person are back in your tray.",
      variant: "success",
    });
  }

  useEffect(() => {
    if (storiesQuery.isError) {
      if (!storyErrorShownRef.current) {
        storyErrorShownRef.current = true;
        pushToast({
          title: "Stories temporarily unavailable",
          message: "We could not refresh stories right now.",
          variant: "error",
        });
      }

      return;
    }

    if (storiesQuery.isSuccess) {
      storyErrorShownRef.current = false;
    }
  }, [storiesQuery.isError, storiesQuery.isSuccess, pushToast]);

  const viewerGroups =
    viewerGroupSource === "muted"
      ? mutedStoryGroups
      : storyGroups;
  const viewerGroup =
    viewerGroupIndex === null ? null : (viewerGroups[viewerGroupIndex] ?? null);
  const myStoryLoading =
    storiesQuery.isLoading && !storiesQuery.data;
  const draftVideoDuration =
    storyDraft?.mediaType === "video"
      ? Math.max(1, storyDraft.videoDuration ?? 30)
      : 0;
  const draftTrimStart =
    storyDraft?.mediaType === "video"
      ? Math.max(0, storyDraft.trimStart ?? 0)
      : 0;
  const draftTrimEnd =
    storyDraft?.mediaType === "video"
      ? Math.max(
          draftTrimStart + 1,
          storyDraft.trimEnd ?? Math.min(draftVideoDuration, 30),
        )
      : 0;
  const draftTrimLength =
    storyDraft?.mediaType === "video"
      ? Math.max(0, draftTrimEnd - draftTrimStart)
      : 0;

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white">Stories</h2>

        {storiesQuery.isFetching ? (
          <Loader2
            size={14}
            className="text-[#4BA3E3] motion-safe:animate-spin"
          />
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.mov,.mp4,.m4v,.3gp,.3gpp,.3g2,.3gpp2"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            openStoryPreview(file);
          }
        }}
      />

      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative flex w-[66px] shrink-0 flex-col items-center gap-2 text-center text-[11px] text-zinc-400">
          <button
            type="button"
            onClick={() => {
              if (myStoryLoading || currentUserStoryGroupIndex < 0) {
                return;
              }

              setViewerGroupSource("visible");
              setViewerGroupIndex(currentUserStoryGroupIndex);
            }}
            disabled={
              createStoryMutation.isPending ||
              myStoryLoading ||
              currentUserStoryGroupIndex < 0
            }
            className="fc-telegram-touch relative flex h-[60px] w-[60px] items-center justify-center rounded-full p-[2px] disabled:cursor-default disabled:opacity-70"
            aria-label={
              currentUserStoryGroup
                ? "View my story"
                : "No story posted yet"
            }
          >
            <span
              className={`absolute inset-0 rounded-full ${
                currentUserStoryGroup
                  ? "fc-story-ring-unseen"
                  : "bg-white/10"
              }`}
            />
            <FlexAvatar
              src={currentUser?.avatar}
              name={currentUser?.username}
              className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0B1520] text-base font-bold text-white ring-2 ring-[#07111B]"
            />
            {createStoryMutation.isPending || myStoryLoading ? (
              <span className="absolute inset-2 flex items-center justify-center rounded-full bg-black/45">
                <Loader2 size={17} className="motion-safe:animate-spin" />
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={openStoryComposer}
            disabled={createStoryMutation.isPending}
            className="fc-telegram-touch absolute right-1 top-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#07111B] bg-[#2481CC] text-white shadow-md disabled:cursor-wait disabled:opacity-70"
            aria-label="Create story"
          >
            <Plus size={14} />
          </button>

          {createStoryMutation.isPending ? (
            <span className="absolute left-2 right-2 top-[52px] h-1 overflow-hidden rounded-full bg-white/15">
              <span
                className="block h-full rounded-full bg-[#4BA3E3] transition-[width]"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </span>
          ) : null}

          <span className="w-full truncate">My Story</span>
        </div>

        {visibleStoryGroups.map((group) => {
          const originalIndex = storyGroups.findIndex(
            (storyGroup) => storyGroup.userId === group.userId,
          );

          return (
          <motion.button
            key={group.userId}
            type="button"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 8,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
            }}
            whileTap={
              reducedMotion
                ? undefined
                : {
                    scale: 0.96,
                  }
            }
            onClick={() => {
              setViewerGroupSource("visible");
              setViewerGroupIndex(originalIndex);
            }}
            className="fc-telegram-touch flex w-[66px] shrink-0 flex-col items-center gap-2 text-center text-[11px] text-zinc-400"
          >
            <span
              className={`relative flex h-[60px] w-[60px] items-center justify-center rounded-full p-[2px] ${
                group.hasUnseen
                  ? "fc-story-ring-unseen"
                  : "bg-white/10"
              }`}
            >
              <FlexAvatar
                src={group.user.avatar}
                name={group.user.username}
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0B1520] text-base font-bold text-white ring-2 ring-[#07111B]"
              />
            </span>
            <span className="w-full truncate">
              {formatDisplayName(group.user.username)}
            </span>
          </motion.button>
          );
        })}
      </div>

      {mutedStoryGroups.length ? (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
          <button
            type="button"
            onClick={() => setMutedStoriesOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2481CC]/12 text-[#8ECFFF]">
                <BellOff size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-zinc-200">
                  Muted stories
                </span>
                <span className="block truncate text-[11px] text-zinc-500">
                  {mutedStoryGroups.length} hidden from your main tray
                </span>
              </span>
            </span>
            <span className="text-[11px] font-medium text-[#8ECFFF]">
              {mutedStoriesOpen ? "Hide" : "Show"}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {mutedStoriesOpen ? (
              <motion.div
                initial={
                  reducedMotion
                    ? false
                    : {
                        opacity: 0,
                        height: 0,
                      }
                }
                animate={{
                  opacity: 1,
                  height: "auto",
                }}
                exit={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: 0,
                        height: 0,
                      }
                }
                className="overflow-hidden"
              >
                <div className="mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                  {mutedStoryGroups.map((group, index) => (
                    <div
                      key={group.userId}
                      className="flex w-[78px] shrink-0 flex-col items-center gap-2 rounded-2xl px-2 py-2 text-center transition hover:bg-white/[0.04]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setViewerGroupSource("muted");
                          setViewerGroupIndex(index);
                        }}
                        className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white/10 p-[2px]"
                        aria-label={`View muted stories from ${formatDisplayName(group.user.username)}`}
                      >
                        <FlexAvatar
                          src={group.user.avatar}
                          name={group.user.username}
                          className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0B1520] text-sm font-bold text-white ring-2 ring-[#07111B]"
                        />
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#07111B] bg-[#0B1520] text-[#8ECFFF]">
                          <Eye size={11} />
                        </span>
                      </button>
                      <span className="w-full truncate text-[11px] text-zinc-400">
                        {formatDisplayName(group.user.username)}
                      </span>
                      <button
                        type="button"
                        onClick={() => unmuteStoryUser(group.userId)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:bg-[#2481CC]/20 hover:text-[#A7D8FF]"
                        aria-label={`Unmute stories from ${formatDisplayName(group.user.username)}`}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <AnimatePresence>
        {storyComposerOpen ? (
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
            className="fixed inset-0 z-[250] flex items-end bg-black/60 px-3 py-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:items-center sm:justify-center"
            onClick={() => setStoryComposerOpen(false)}
          >
            <motion.div
              initial={{
                y: 24,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: 24,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 34,
              }}
              className="chat-safe-scroll max-h-[min(88dvh,640px)] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#07111B]/95 p-3 text-white shadow-lg shadow-black/25 sm:max-w-sm"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <h3 className="text-sm font-semibold">Create story</h3>
                <button
                  type="button"
                  onClick={() => setStoryComposerOpen(false)}
                  className="fc-telegram-touch flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
                  aria-label="Close story creator"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-2 p-1">
                <button
                  type="button"
                  onClick={chooseMediaStory}
                  className="fc-telegram-touch flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.07]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2481CC]/15 text-[#7CC5FF]">
                    <ImageIcon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">
                      Photo or video
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      Share media with lightweight editing
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openTextStoryDraft}
                  className="fc-telegram-touch flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.07]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E1306C]/15 text-[#FF8FB5]">
                    <Type size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">
                      Text story
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      Pick a background and centered type
                    </span>
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {failedStoryUpload ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.08] p-3 text-sm text-red-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/25">
            {failedStoryUpload.file?.type.startsWith("image/") &&
            failedStoryUpload.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={failedStoryUpload.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <AlertCircle size={17} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-medium">Story upload failed</p>
            <p className="truncate text-xs text-red-100/70">
              {failedStoryUpload.message}
            </p>
          </div>

          <button
            type="button"
            onClick={retryFailedStoryUpload}
            disabled={createStoryMutation.isPending}
            className="fc-telegram-touch flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
            aria-label="Retry story upload"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={clearFailedStoryUpload}
            className="fc-telegram-touch flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/15"
            aria-label="Dismiss story upload error"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {storyDraft ? (
        <div className="fixed inset-0 z-[255] flex items-center justify-center overscroll-none bg-black text-white">
          <div
            ref={storyCanvasRef}
            className="relative touch-none overflow-hidden bg-black"
            style={{
              aspectRatio: "9 / 16",
              width: "min(100vw, calc(100dvh * 9 / 16), calc(100svh * 9 / 16))",
              height: "min(100dvh, 100svh, calc(100vw * 16 / 9))",
            }}
            onPointerDown={startStoryDrawing}
            onPointerMove={continueStoryDrawing}
            onPointerUp={endStoryDrawing}
            onPointerCancel={endStoryDrawing}
          >
            {storyDraft.mediaType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storyDraft.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : storyDraft.mediaType === "video" ? (
              <video
                src={storyDraft.previewUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, ${storyDraft.backgroundColor ?? storyBackgroundColors[0]}, #020617)`,
                }}
              />
            )}

            {storyDraft.drawStrokes?.length ? (
              <svg
                className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {storyDraft.drawStrokes.map((stroke, index) => (
                  <polyline
                    key={`${index}-${stroke.points.length}`}
                    fill="none"
                    points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
                    stroke={stroke.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            ) : null}

            {storyDraft.sticker ? (
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setStickerDragging(true);
                  startDraftElementDrag("sticker");
                  moveStorySticker(event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (stickerDragging) {
                    moveStorySticker(event.clientX, event.clientY);
                    updateDraftElementDrag(
                      "sticker",
                      event.clientX,
                      event.clientY,
                    );
                  }
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }

                  finishDraftElementDrag(
                    "sticker",
                    event.clientX,
                    event.clientY,
                  );
                  setStickerDragging(false);
                }}
                onPointerCancel={() => {
                  clearDragHoldTimer();
                  setDragDeleteState(null);
                  setStickerDragging(false);
                }}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-2xl px-3 py-1 font-black tracking-wide text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${storyDraft.sticker.x}%`,
                  top: `${storyDraft.sticker.y}%`,
                  fontSize: `${storyDraft.sticker.size}px`,
                }}
              >
                {storyDraft.sticker.label}
              </div>
            ) : null}

            {storyDraft.textOverlay && !textOverlayEditorOpen ? (
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setOverlayDragging(true);
                  startDraftElementDrag("text");
                  moveStoryTextOverlay(event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (overlayDragging) {
                    moveStoryTextOverlay(event.clientX, event.clientY);
                    updateDraftElementDrag(
                      "text",
                      event.clientX,
                      event.clientY,
                    );
                  }
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }

                  finishDraftElementDrag(
                    "text",
                    event.clientX,
                    event.clientY,
                  );
                  setOverlayDragging(false);
                }}
                onPointerCancel={() => {
                  clearDragHoldTimer();
                  setDragDeleteState(null);
                  setOverlayDragging(false);
                }}
                onDoubleClick={() => setTextOverlayEditorOpen(true)}
                style={{
                  position: "absolute",
                  zIndex: 30,
                  left: `${storyDraft.textOverlay.x}%`,
                  top: `${storyDraft.textOverlay.y}%`,
                  transform: "translate(-50%,-50%)",
                  maxWidth: "78%",
                  color: storyDraft.textOverlay.color,
                  fontSize: `${storyDraft.textOverlay.fontSize}px`,
                  fontFamily: `${storyDraft.textOverlay.fontFamily}, Arial, sans-serif`,
                  textAlign: storyDraft.textOverlay.align,
                  background: storyDraft.textOverlay.highlight
                    ? "rgba(0,0,0,0.46)"
                    : "transparent",
                  borderRadius: 18,
                  padding: "8px 12px",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  cursor: "move",
                  touchAction: "none",
                  transition: "transform 180ms ease, opacity 180ms ease",
                }}
              >
                {storyDraft.textOverlay.text}
              </div>
            ) : null}
          </div>

          <AnimatePresence>
            {dragDeleteState?.active ? (
              <motion.div
                ref={deleteZoneRef}
                initial={
                  reducedMotion
                    ? false
                    : {
                        opacity: 0,
                        y: 28,
                        scale: 0.86,
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: dragDeleteState.overDelete ? 1.12 : 1,
                }}
                exit={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: 0,
                        y: 24,
                        scale: 0.9,
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: 360,
                  damping: 28,
                }}
                className={cn(
                  "pointer-events-none absolute bottom-[calc(7.25rem+env(safe-area-inset-bottom))] left-1/2 z-[42] flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border backdrop-blur-2xl will-change-transform",
                  dragDeleteState.overDelete
                    ? "border-red-200/60 bg-red-500/35 text-white shadow-[0_0_34px_rgba(248,113,113,0.36)]"
                    : "border-white/15 bg-black/45 text-white/80 shadow-[0_18px_44px_rgba(0,0,0,0.35)]",
                )}
              >
                <Trash2 size={28} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            className={cn(
              "absolute inset-x-0 top-0 z-[35] flex items-center justify-between gap-2 bg-gradient-to-b from-black/65 to-transparent px-4 pb-12 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white transition-opacity duration-150",
              textOverlayEditorOpen &&
                "pointer-events-none opacity-0",
            )}
          >
            <button
              type="button"
              onClick={cancelStoryDraft}
              className={STORY_TOOL_BUTTON_CLASS}
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={openImageTextTool}
                className={cn(
                  STORY_TOOL_BUTTON_CLASS,
                  storyDraft.textOverlay && "bg-white/[0.18]",
                )}
                aria-label="Text"
              >
                <Type size={21} />
              </button>
            <button
              type="button"
              onClick={() =>
                updateStoryTextOverlay((overlay) => ({
                  ...overlay,
                  color:
                    storyTextColors[
                      (storyTextColors.indexOf(overlay.color) + 1) %
                        storyTextColors.length
                    ] ?? "#ffffff",
                }))
              }
              aria-label="Color"
              className={STORY_TOOL_BUTTON_CLASS}
            >
              <Palette size={21} />
            </button>
            <button
              type="button"
              onClick={addOrCycleSticker}
              disabled={storyDraft.mediaType === "video"}
              className={cn(
                STORY_TOOL_BUTTON_CLASS,
                storyDraft.sticker && "bg-white/[0.18]",
              )}
              aria-label="Add sticker"
            >
              <Smile size={21} />
            </button>
            <button
              type="button"
              onClick={toggleDrawingMode}
              disabled={storyDraft.mediaType === "video"}
              aria-label="Draw"
              className={cn(
                STORY_TOOL_BUTTON_CLASS,
                storyDraft.drawingMode && "bg-[#2481CC]",
              )}
            >
              <PenLine size={21} />
            </button>
            <button
              type="button"
              onClick={deleteSelectedDraftElement}
              disabled={
                !selectedDraftElement &&
                !storyDraft.textOverlay &&
                !storyDraft.sticker &&
                !storyDraft.drawStrokes?.length
              }
              className={STORY_TOOL_BUTTON_CLASS}
              aria-label="Delete selected story element"
            >
              <Trash2 size={21} />
            </button>
            </div>
          </div>

          <div className="chat-safe-scroll absolute inset-x-0 bottom-0 z-[35] max-h-[56dvh] overflow-y-auto bg-gradient-to-t from-black/75 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-16">
            {storyDraft.mediaType === "video" ? (
              <div className="mb-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-white backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">
                    Trim story
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      draftTrimLength > 30.1
                        ? "text-amber-200"
                        : "text-white/60",
                    )}
                  >
                    {formatStoryTrimTime(draftTrimStart)} - {formatStoryTrimTime(draftTrimEnd)}
                  </span>
                </div>
                <div className="grid gap-2">
                  <label className="grid grid-cols-[3.25rem_1fr] items-center gap-3 text-[11px] text-white/55">
                    Start
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1, draftVideoDuration - 1)}
                      step={0.1}
                      value={draftTrimStart}
                      onChange={(event) =>
                        updateVideoTrimStart(Number(event.target.value))
                      }
                      className="w-full"
                      style={{ accentColor: "#2481CC" }}
                    />
                  </label>
                  <label className="grid grid-cols-[3.25rem_1fr] items-center gap-3 text-[11px] text-white/55">
                    End
                    <input
                      type="range"
                      min={Math.min(draftVideoDuration, draftTrimStart + 1)}
                      max={draftVideoDuration}
                      step={0.1}
                      value={Math.min(draftVideoDuration, draftTrimEnd)}
                      onChange={(event) =>
                        updateVideoTrimEnd(Number(event.target.value))
                      }
                      className="w-full"
                      style={{ accentColor: "#2481CC" }}
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
                  <span>{formatStoryTrimTime(draftTrimLength)} selected</span>
                  <span>Maximum 0:30</span>
                </div>
              </div>
            ) : null}
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white backdrop-blur-xl">
              <span className="font-semibold">Your Story</span>
              <span className="text-xs text-white/55">24h</span>
            </div>
            <button
              type="button"
              onClick={confirmStoryDraftUpload}
              disabled={
                createStoryMutation.isPending ||
                storyPreparing ||
                (storyDraft.mediaType === "text" &&
                  !storyDraft.caption.trim() &&
                  !storyDraft.textOverlay?.text.trim())
              }
              className="fc-telegram-touch flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#2481CC] px-5 text-base font-semibold text-white transition hover:bg-[#2F8ED8] disabled:cursor-wait disabled:opacity-70"
            >
              {storyPreparing
                ? "Preparing..."
                : createStoryMutation.isPending
                  ? "Sharing..."
                  : "Share to Story"}
            </button>
          </div>

          {textOverlayEditorOpen && storyDraft.textOverlay ? (
            <div className="absolute inset-0 z-[45] bg-black/60 text-white backdrop-blur-sm">
              <textarea
                autoFocus
                value={storyDraft.textOverlay.text}
                onChange={(event) =>
                  updateStoryTextOverlay((overlay) => ({
                    ...overlay,
                    text: event.target.value.slice(0, 120),
                  }))
                }
                className="absolute left-1/2 top-1/2 min-h-28 w-[82%] -translate-x-1/2 -translate-y-1/2 resize-none border-0 bg-transparent text-center font-bold leading-tight text-white outline-none placeholder:text-white/45"
                style={{
                  color: storyDraft.textOverlay.color,
                  fontFamily: `${storyDraft.textOverlay.fontFamily}, Arial, sans-serif`,
                  fontSize: storyDraft.textOverlay.fontSize,
                  textAlign: storyDraft.textOverlay.align,
                }}
              />
              <div className="absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] px-4">
                {storyDraft.mediaType === "text" ? (
                  <div className="mb-3 flex justify-center gap-2.5">
                    {storyBackgroundColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setStoryDraft((draft) =>
                            draft
                              ? {
                                  ...draft,
                                  backgroundColor: color,
                                }
                              : draft,
                          )
                        }
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: color,
                          border:
                            storyDraft.backgroundColor === color
                              ? "2px solid #fff"
                              : "1px solid rgba(255,255,255,0.32)",
                        }}
                        aria-label={`Use background ${color}`}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="flex justify-center gap-2.5">
                  {(["Inter", "Georgia", "Impact"] as const).map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() =>
                        updateStoryTextOverlay((overlay) => ({
                          ...overlay,
                          fontFamily: font,
                        }))
                      }
                      style={{
                        borderRadius: 16,
                        padding: "8px 12px",
                        background:
                          storyDraft.textOverlay?.fontFamily === font
                            ? "#2481CC"
                            : "rgba(255,255,255,0.16)",
                        color: "#fff",
                      }}
                    >
                      {font}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex justify-center gap-2.5">
                  {storyTextColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        updateStoryTextOverlay((overlay) => ({
                          ...overlay,
                          color,
                        }))
                      }
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: color,
                        border:
                          storyDraft.textOverlay?.color === color
                            ? "2px solid #fff"
                            : "1px solid rgba(255,255,255,0.35)",
                      }}
                      aria-label={`Use ${color}`}
                    />
                  ))}
                  {(["left", "center", "right"] as const).map((align) => {
                    const Icon =
                      align === "left"
                        ? AlignLeft
                        : align === "right"
                          ? AlignRight
                          : AlignCenter;

                    return (
                      <button
                        key={align}
                        type="button"
                        onClick={() =>
                          updateStoryTextOverlay((overlay) => ({
                            ...overlay,
                            align,
                          }))
                        }
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          background:
                            storyDraft.textOverlay?.align === align
                              ? "#2481CC"
                              : "rgba(255,255,255,0.16)",
                          color: "#fff",
                        }}
                        aria-label={`${align} align`}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>

                <input
                  type="range"
                  min={22}
                  max={58}
                  value={storyDraft.textOverlay.fontSize}
                  onChange={(event) =>
                    updateStoryTextOverlay((overlay) => ({
                      ...overlay,
                      fontSize: Number(event.target.value),
                    }))
                  }
                  className="mt-4 w-full"
                  style={{ accentColor: "#2481CC" }}
                  aria-label="Font size"
                />
              </div>
              <button
                type="button"
                onClick={() => setTextOverlayEditorOpen(false)}
                className="absolute right-4 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/15"
              >
                <Check size={18} />
                Done
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <StoryViewer
        group={viewerGroup}
        groups={viewerGroups}
        groupIndex={viewerGroupIndex}
        onGroupIndexChange={setViewerGroupIndex}
        onMuteUser={muteStoryUser}
        onClose={() => setViewerGroupIndex(null)}
      />
    </section>
  );
}
