"use client";

import { generateId } from "@/lib/uuid";
import {
  memo,
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
  Check,
  Image as ImageIcon,
  Palette,
  PenLine,
  RefreshCw,
  Smile,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { createStory } from "@/services/story.service";
import {
  getUploadValidationError,
  uploadImage,
} from "@/services/upload.service";
import { useToastStore } from "@/store/toast-store";
import { useThemeStore } from "@/store/theme-store";
import { getServerNow } from "@/lib/server-time";
import type { Story } from "@/types/story";

// --- Types ---

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

// --- Constants ---

const TEXT_STORY_MEDIA_URL = "flexchat://story/text";
const FALLBACK_STORY_TEXT_COLORS = ["#ffffff", "#dff3ff", "#8ecfff", "#f8a4c5", "#c7d2fe"];
const FALLBACK_STORY_BACKGROUND_COLORS = ["#2aabee", "#2b5278", "#0e1621", "#17212b", "#232e3c"];
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

// --- Helpers ---

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
  if (file.type.startsWith("video/") || STORY_VIDEO_EXTENSIONS.includes(extension ?? "")) {
    return "video";
  }
  if (file.type.startsWith("image/") || STORY_IMAGE_EXTENSIONS.includes(extension ?? "")) {
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
  return new Promise<{ image: HTMLImageElement; url: string }>((resolve, reject) => {
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

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
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
  if (!overlay || !text) return;
  const fontSize = Math.round(Math.max(22, Math.min(112, overlay.fontSize * (width / 390))));
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
  const blockX = overlay.align === "left" ? x : overlay.align === "right" ? x - blockWidth : x - blockWidth / 2;
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
  if (!sticker) return;
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
  if (!strokes?.length) return;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(7, width * 0.012);

  strokes.forEach((stroke) => {
    if (stroke.points.length < 2) return;
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

    return canvasToStoryFile(canvas, `${file.name.replace(/\.[^.]+$/, "") || "story"}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderTextStoryFile(draft: StoryDraft, storyBackgroundColors: string[]) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Text story could not be prepared.");

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
  if (typeof MediaRecorder === "undefined") return "";
  return (
    ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) ?? ""
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
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }
    function handleSeeked() {
      finish();
    }
    function handleError() {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Video trim preview could not seek."));
    }
    const fallbackTimer = window.setTimeout(finish, 500);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    video.currentTime = time;
    if (Math.abs(video.currentTime - time) < 0.05) finish();
  });
}

async function trimStoryVideoFile(
  file: File,
  startSeconds: number,
  endSeconds: number,
  onProgress?: (progress: number) => void,
) {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot trim videos.");
  }
  const mimeType = getSupportedStoryRecordingMimeType();
  if (!mimeType) throw new Error("This browser cannot trim videos.");

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
    if (!context) throw new Error("Video trim unavailable.");

    canvas.width = Math.max(2, Math.round(sourceWidth * scale));
    canvas.height = Math.max(2, Math.round(sourceHeight * scale));

    const canvasStream = canvas.captureStream(24);
    const mediaElementStream =
      (video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).captureStream?.() ?? 
      (video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).mozCaptureStream?.();

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
      if (recorder.state !== "inactive") recorder.stop();
    }

    function drawFrame() {
      if (video.currentTime >= end || video.ended) {
        stopRecording();
        return;
      }
      context!.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(Math.min(90, Math.max(8, Math.round(((video.currentTime - start) / (end - start)) * 82))));
      frameId = requestAnimationFrame(drawFrame);
    }

    stopTimer = window.setTimeout(stopRecording, Math.ceil((end - start) * 1000) + 700);

    const trimmedBlob = await new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("Video trim failed."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.start(500);
      frameId = requestAnimationFrame(drawFrame);
      void video.play().catch(reject);
    });

    canvasStream.getTracks().forEach((track) => track.stop());
    onProgress?.(92);

    return new File([trimmedBlob], `${file.name.replace(/\.[^.]+$/, "") || "story"}-trimmed.webm`, {
      type: "video/webm",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// --- Component ---

type StoryCreatorProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Story["user"] | null | undefined;
};

export const StoryCreator = memo(({ isOpen, onClose, currentUser }: StoryCreatorProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storyCanvasRef = useRef<HTMLDivElement | null>(null);
  const deleteZoneRef = useRef<HTMLDivElement | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const dragHoldTimerRef = useRef<number | null>(null);
  const deleteHoverRef = useRef(false);
  
  const [storyPreparing, setStoryPreparing] = useState(false);
  const [failedStoryUpload, setFailedStoryUpload] = useState<FailedStoryUpload | null>(null);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyDraft, setStoryDraft] = useState<StoryDraft | null>(null);
  const [textOverlayEditorOpen, setTextOverlayEditorOpen] = useState(false);
  const [overlayDragging, setOverlayDragging] = useState(false);
  const [stickerDragging, setStickerDragging] = useState(false);
  const [selectedDraftElement, setSelectedDraftElement] = useState<DraftElementKind | null>(null);
  const [dragDeleteState, setDragDeleteState] = useState<{
    kind: DraftElementKind;
    active: boolean;
    overDelete: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const themeId = useThemeStore((state) => state.themeId);

  const storyTextColors = useMemo(() => {
    void themeId;
    return getStoryTextColors();
  }, [themeId]);

  const storyBackgroundColors = useMemo(() => {
    void themeId;
    return getStoryBackgroundColors();
  }, [themeId]);

  const createStoryMutation = useMutation({
    mutationFn: async ({ file, mediaType, caption }: StoryUploadInput) => {
      if (!currentUser) throw new Error("Please sign in again before publishing a story.");

      if (mediaType === "text") {
        const text = caption.trim();
        if (!text) throw new Error("Write something before publishing a text story.");
        setUploadProgress(94);
        return createStory({ mediaUrl: TEXT_STORY_MEDIA_URL, mediaType: "text", caption: text });
      }

      if (!file) throw new Error("Choose a story photo or video first.");
      const validationError = getStoryValidationError(file);
      if (validationError) throw new Error(validationError);

      if (mediaType === "video") {
        const duration = await getVideoDurationSeconds(file).catch(() => null);
        if (typeof duration === "number" && Number.isFinite(duration) && duration > 30) {
          throw new Error("Story videos must be 30 seconds or shorter.");
        }
      }

      const mediaUrl = await uploadImage(file, {
        onProgress: (p) => setUploadProgress(Math.min(88, Math.max(8, p))),
      });
      setUploadProgress(94);

      return createStory({ mediaUrl, mediaType, caption: caption.trim() || undefined });
    },
    onMutate: ({ optimisticId, previewUrl, caption, mediaType }) => {
      setUploadProgress(4);
      setFailedStoryUpload(null);
      if (!currentUser) return { optimisticId, previewUrl };

      const optimisticStory: Story = {
        id: optimisticId,
        userId: currentUser.id,
        mediaUrl: previewUrl ?? TEXT_STORY_MEDIA_URL,
        mediaType,
        durationSeconds: mediaType === "video" ? 30 : 5,
        caption: caption.trim(),
        createdAt: new Date(getServerNow()).toISOString(),
        expiresAt: new Date(getServerNow() + 86400000).toISOString(),
        viewed: true,
        viewCount: 0,
        user: { id: currentUser.id, username: currentUser.username, avatar: currentUser.avatar },
      };

      queryClient.setQueryData<Story[]>(queryKeys.stories.all, (old) => [optimisticStory, ...(old ?? [])]);
      return { optimisticId, previewUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories.all });
      setUploadProgress(100);
      pushToast({ title: "Story published", message: "Your story is now visible to others.", variant: "success" });
    },
    onError: (error, variables, context) => {
      const message = error instanceof Error ? error.message : "We could not share your story right now.";
      setFailedStoryUpload({
        file: variables.file,
        mediaType: variables.mediaType,
        caption: variables.caption,
        message,
        previewUrl: variables.previewUrl,
      });
      queryClient.setQueryData<Story[]>(queryKeys.stories.all, (old) =>
        (old ?? []).filter((s) => s.id !== context?.optimisticId),
      );
      pushToast({ title: "Could not share story", message, variant: "error" });
    },
  });

  const publishStory = useCallback((draft: StoryDraft) => {
    createStoryMutation.mutate({
      file: draft.file,
      optimisticId: generateId(),
      previewUrl: draft.previewUrl,
      mediaType: draft.mediaType,
      caption: draft.caption,
    });
  }, [createStoryMutation]);

  const openStoryComposer = () => {
    setStoryComposerOpen(true);
    setFailedStoryUpload(null);
  };

  const chooseMediaStory = () => {
    setStoryComposerOpen(false);
    fileInputRef.current?.click();
  };

  const openStoryPreview = async (file: File) => {
    const mediaType = getStoryMediaType(file);
    const validationError = getStoryValidationError(file);

    if (validationError) {
      pushToast({ title: "Could not use that file", message: validationError, variant: "error" });
      return;
    }

    try {
      const previewUrl = URL.createObjectURL(file);
      let videoDuration: number | undefined;

      if (mediaType === "video") {
        videoDuration = await getVideoDurationSeconds(file);
      }

      setStoryDraft({
        file,
        previewUrl,
        mediaType,
        caption: "",
        videoDuration,
        trimStart: 0,
        trimEnd: videoDuration ? Math.min(videoDuration, 30) : undefined,
      });
      setStoryComposerOpen(false);
    } catch (error) {
      pushToast({
        title: "Story could not be prepared",
        message: error instanceof Error ? error.message : "Please try a different photo or video.",
        variant: "error",
      });
    }
  };

  const openTextStoryDraft = () => {
    setStoryDraft({ mediaType: "text", caption: "", backgroundColor: storyBackgroundColors[0] });
    setStoryComposerOpen(false);
    setTextOverlayEditorOpen(true);
  };

  const updateStoryTextOverlay = (updater: (overlay: StoryTextOverlay) => StoryTextOverlay) => {
    setStoryDraft((draft) => {
      if (!draft) return draft;
      const current = draft.textOverlay ?? { ...DEFAULT_STORY_TEXT_OVERLAY, color: storyTextColors[0] };
      return { ...draft, textOverlay: updater(current) };
    });
  };

  const moveStoryTextOverlay = (clientX: number, clientY: number) => {
    if (!storyCanvasRef.current) return;
    const rect = storyCanvasRef.current.getBoundingClientRect();
    const x = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((clientY - rect.top) / rect.height) * 100));
    updateStoryTextOverlay((overlay) => ({ ...overlay, x, y }));
  };

  const openImageTextTool = () => {
    if (!storyDraft?.textOverlay) {
      updateStoryTextOverlay((overlay) => overlay);
    }
    setTextOverlayEditorOpen(true);
  };

  const addOrCycleSticker = () => {
    setStoryDraft((draft) => {
      if (!draft) return draft;
      const currentIndex = draft.sticker ? STORY_STICKERS.indexOf(draft.sticker.label) : -1;
      const nextIndex = (currentIndex + 1) % (STORY_STICKERS.length + 1);
      if (nextIndex === STORY_STICKERS.length) return { ...draft, sticker: undefined };
      return { ...draft, sticker: { label: STORY_STICKERS[nextIndex], x: 50, y: 50, size: 68 } };
    });
  };

  const moveStorySticker = (clientX: number, clientY: number) => {
    if (!storyCanvasRef.current) return;
    const rect = storyCanvasRef.current.getBoundingClientRect();
    const x = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((clientY - rect.top) / rect.height) * 100));
    setStoryDraft((draft) => (draft?.sticker ? { ...draft, sticker: { ...draft.sticker, x, y } } : draft));
  };

  const toggleDrawingMode = () => {
    setStoryDraft((draft) => (draft ? { ...draft, drawingMode: !draft.drawingMode } : draft));
    if (storyDraft?.drawingMode) setSelectedDraftElement(null);
  };

  const startStoryDrawing = (event: ReactPointerEvent) => {
    if (!storyDraft?.drawingMode || !storyCanvasRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointerIdRef.current = event.pointerId;
    const rect = storyCanvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setStoryDraft((draft) => {
      if (!draft) return draft;
      const strokes = draft.drawStrokes ?? [];
      return { ...draft, drawStrokes: [...strokes, { color: storyTextColors[0], points: [{ x, y }] }] };
    });
  };

  const continueStoryDrawing = (event: ReactPointerEvent) => {
    if (!storyDraft?.drawingMode || drawingPointerIdRef.current !== event.pointerId || !storyCanvasRef.current) return;
    const rect = storyCanvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setStoryDraft((draft) => {
      if (!draft?.drawStrokes?.length) return draft;
      const strokes = [...draft.drawStrokes];
      const last = strokes[strokes.length - 1];
      last.points.push({ x, y });
      return { ...draft, drawStrokes: strokes };
    });
  };

  const endStoryDrawing = (event: ReactPointerEvent) => {
    if (drawingPointerIdRef.current === event.pointerId) {
      drawingPointerIdRef.current = null;
    }
  };

  const clearDragHoldTimer = () => {
    if (dragHoldTimerRef.current) {
      window.clearTimeout(dragHoldTimerRef.current);
      dragHoldTimerRef.current = null;
    }
  };

  const startDraftElementDrag = (kind: DraftElementKind) => {
    setSelectedDraftElement(kind);
    clearDragHoldTimer();
    dragHoldTimerRef.current = window.setTimeout(() => {
      setDragDeleteState({ kind, active: true, overDelete: false });
    }, 180);
  };

  const updateDraftElementDrag = (kind: DraftElementKind, clientX: number, clientY: number) => {
    if (!dragDeleteState?.active || !deleteZoneRef.current) return;
    const rect = deleteZoneRef.current.getBoundingClientRect();
    const over = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    if (over !== deleteHoverRef.current) {
      deleteHoverRef.current = over;
      setDragDeleteState((s) => (s ? { ...s, overDelete: over } : s));
    }
  };

  const finishDraftElementDrag = (kind: DraftElementKind, clientX: number, clientY: number) => {
    clearDragHoldTimer();
    const wasOverDelete = deleteHoverRef.current;
    setDragDeleteState(null);
    deleteHoverRef.current = false;
    if (wasOverDelete) {
      if (kind === "text") setStoryDraft((d) => (d ? { ...d, textOverlay: undefined } : d));
      else if (kind === "sticker") setStoryDraft((d) => (d ? { ...d, sticker: undefined } : d));
      setSelectedDraftElement(null);
    }
  };

  const deleteSelectedDraftElement = () => {
    if (selectedDraftElement === "text") setStoryDraft((d) => (d ? { ...d, textOverlay: undefined } : d));
    else if (selectedDraftElement === "sticker") setStoryDraft((d) => (d ? { ...d, sticker: undefined } : d));
    else {
      setStoryDraft((d) => (d ? { ...d, textOverlay: undefined, sticker: undefined, drawStrokes: [] } : d));
    }
    setSelectedDraftElement(null);
  };

  const updateVideoTrimStart = (val: number) => {
    setStoryDraft((d) => {
      if (!d) return d;
      const start = Math.max(0, val);
      const end = Math.max(start + 1, d.trimEnd ?? 30);
      return { ...d, trimStart: start, trimEnd: end };
    });
  };

  const updateVideoTrimEnd = (val: number) => {
    setStoryDraft((d) => {
      if (!d) return d;
      const end = Math.max((d.trimStart ?? 0) + 1, val);
      return { ...d, trimEnd: end };
    });
  };

  const confirmStoryDraftUpload = async () => {
    const draft = storyDraft;
    if (!draft || storyPreparing) return;
    setStoryPreparing(true);

    let uploadDraft = { ...draft };

    try {
      if (draft.mediaType === "text") {
        uploadDraft.file = await renderTextStoryFile(draft, storyBackgroundColors);
        uploadDraft.previewUrl = URL.createObjectURL(uploadDraft.file);
      } else if (draft.mediaType === "video" && typeof draft.trimStart === "number") {
        uploadDraft.file = await trimStoryVideoFile(draft.file!, draft.trimStart, draft.trimEnd!, (p) => setUploadProgress(p));
        uploadDraft.previewUrl = URL.createObjectURL(uploadDraft.file);
      } else if (draft.file && (draft.textOverlay || draft.sticker || draft.drawStrokes?.length)) {
        const bakedFile = await bakeStoryTextOverlay(draft.file, draft.textOverlay, draft.sticker, draft.drawStrokes);
        const bakedPreviewUrl = URL.createObjectURL(bakedFile);
        if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
        uploadDraft = { ...draft, file: bakedFile, previewUrl: bakedPreviewUrl, textOverlay: undefined, sticker: undefined, drawStrokes: undefined, drawingMode: false };
      }
    } catch (error) {
      pushToast({
        title: "Story could not be prepared",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
      setStoryPreparing(false);
      return;
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
  };

  const cancelStoryDraft = () => {
    if (storyDraft?.previewUrl) URL.revokeObjectURL(storyDraft.previewUrl);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearFailedStoryUpload = () => {
    if (failedStoryUpload?.previewUrl) URL.revokeObjectURL(failedStoryUpload.previewUrl);
    setFailedStoryUpload(null);
  };

  const retryFailedStoryUpload = () => {
    const failed = failedStoryUpload;
    if (!failed) return;
    setFailedStoryUpload(null);
    publishStory({ file: failed.file, previewUrl: failed.previewUrl, mediaType: failed.mediaType, caption: failed.caption });
  };

  useEffect(() => {
    if (isOpen && !storyDraft && !failedStoryUpload) {
      setStoryComposerOpen(true);
    } else if (!isOpen) {
      setStoryComposerOpen(false);
    }
  }, [isOpen, storyDraft, failedStoryUpload]);

  const draftTrimStart = storyDraft?.mediaType === "video" ? Math.max(0, storyDraft.trimStart ?? 0) : 0;
  const draftVideoDuration = storyDraft?.mediaType === "video" ? Math.max(1, storyDraft.videoDuration ?? 30) : 0;
  const draftTrimEnd = storyDraft?.mediaType === "video" ? Math.max(draftTrimStart + 1, storyDraft.trimEnd ?? Math.min(draftVideoDuration, 30)) : 0;
  const draftTrimLength = storyDraft?.mediaType === "video" ? Math.max(0, draftTrimEnd - draftTrimStart) : 0;

  if (!isOpen && !storyDraft && !failedStoryUpload && !storyComposerOpen) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.mov,.mp4,.m4v,.3gp,.3gpp,.3g2,.3gpp2"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) openStoryPreview(file);
        }}
      />

      <AnimatePresence>
        {storyComposerOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end bg-black/60 px-3 py-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:items-center sm:justify-center"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="chat-safe-scroll max-h-[min(88dvh,640px)] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0E1621]/95 p-3 text-white shadow-lg shadow-black/25 sm:max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <h3 className="text-sm font-semibold">Create story</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="fc-telegram-touch flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-2 p-1">
                <button type="button" onClick={chooseMediaStory} className="fc-telegram-touch flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.07]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2AABEE]/15 text-[#75CFF6]"><ImageIcon size={19} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">Photo or video</span>
                    <span className="block truncate text-xs text-zinc-500">Share media with lightweight editing</span>
                  </span>
                </button>
                <button type="button" onClick={openTextStoryDraft} className="fc-telegram-touch flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.07]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E1306C]/15 text-[#FF8FB5]"><Type size={19} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">Text story</span>
                    <span className="block truncate text-xs text-zinc-500">Pick a background and centered type</span>
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
            {failedStoryUpload.file?.type.startsWith("image/") && failedStoryUpload.previewUrl ? (
              <img src={failedStoryUpload.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : <AlertCircle size={17} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Story upload failed</p>
            <p className="truncate text-xs text-red-100/70">{failedStoryUpload.message}</p>
          </div>
          <button type="button" onClick={retryFailedStoryUpload} disabled={createStoryMutation.isPending} className="fc-telegram-touch flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/15 disabled:opacity-60"><RefreshCw size={15} /></button>
          <button type="button" onClick={clearFailedStoryUpload} className="fc-telegram-touch flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/15"><X size={15} /></button>
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
              <img src={storyDraft.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : storyDraft.mediaType === "video" ? (
              <video src={storyDraft.previewUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${storyDraft.backgroundColor ?? storyBackgroundColors[0]}, #020617)` }} />
            )}

            {storyDraft.drawStrokes?.length ? (
              <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {storyDraft.drawStrokes.map((stroke, index) => (
                  <polyline key={`${index}-${stroke.points.length}`} fill="none" points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")} stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
            ) : null}

            {storyDraft.sticker ? (
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setStickerDragging(true); startDraftElementDrag("sticker"); moveStorySticker(e.clientX, e.clientY); }}
                onPointerMove={(e) => { if (stickerDragging) { moveStorySticker(e.clientX, e.clientY); updateDraftElementDrag("sticker", e.clientX, e.clientY); } }}
                onPointerUp={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); finishDraftElementDrag("sticker", e.clientX, e.clientY); setStickerDragging(false); }}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-2xl px-3 py-1 font-black tracking-wide text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
                style={{ left: `${storyDraft.sticker.x}%`, top: `${storyDraft.sticker.y}%`, fontSize: `${storyDraft.sticker.size}px` }}
              >
                {storyDraft.sticker.label}
              </div>
            ) : null}

            {storyDraft.textOverlay && !textOverlayEditorOpen ? (
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setOverlayDragging(true); startDraftElementDrag("text"); moveStoryTextOverlay(e.clientX, e.clientY); }}
                onPointerMove={(e) => { if (overlayDragging) { moveStoryTextOverlay(e.clientX, e.clientY); updateDraftElementDrag("text", e.clientX, e.clientY); } }}
                onPointerUp={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); finishDraftElementDrag("text", e.clientX, e.clientY); setOverlayDragging(false); }}
                onDoubleClick={() => setTextOverlayEditorOpen(true)}
                style={{ position: "absolute", zIndex: 30, left: `${storyDraft.textOverlay.x}%`, top: `${storyDraft.textOverlay.y}%`, transform: "translate(-50%,-50%)", maxWidth: "78%", color: storyDraft.textOverlay.color, fontSize: `${storyDraft.textOverlay.fontSize}px`, fontFamily: `${storyDraft.textOverlay.fontFamily}, Arial, sans-serif`, textAlign: storyDraft.textOverlay.align, background: storyDraft.textOverlay.highlight ? "rgba(0,0,0,0.46)" : "transparent", borderRadius: 18, padding: "8px 12px", fontWeight: 700, lineHeight: 1.1, whiteSpace: "pre-wrap", wordBreak: "break-word", cursor: "move", touchAction: "none" }}
              >
                {storyDraft.textOverlay.text}
              </div>
            ) : null}
          </div>

          <AnimatePresence>
            {dragDeleteState?.active ? (
              <motion.div ref={deleteZoneRef} initial={{ opacity: 0, y: 28, scale: 0.86 }} animate={{ opacity: 1, y: 0, scale: dragDeleteState.overDelete ? 1.12 : 1 }} exit={{ opacity: 0, y: 24, scale: 0.9 }} className={cn("pointer-events-none absolute bottom-[calc(7.25rem+env(safe-area-inset-bottom))] left-1/2 z-[42] flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border backdrop-blur-2xl", dragDeleteState.overDelete ? "border-red-200/60 bg-red-500/35 text-white shadow-[0_0_34px_rgba(248,113,113,0.36)]" : "border-white/15 bg-black/45 text-white/80 shadow-[0_18px_44px_rgba(0,0,0,0.35)]")}><Trash2 size={28} /></motion.div>
            ) : null}
          </AnimatePresence>

          <div className={cn("absolute inset-x-0 top-0 z-[35] flex items-center justify-between gap-2 bg-gradient-to-b from-black/65 to-transparent px-4 pb-12 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white transition-opacity duration-150", textOverlayEditorOpen && "pointer-events-none opacity-0")}>
            <button type="button" onClick={cancelStoryDraft} className={STORY_TOOL_BUTTON_CLASS} aria-label="Close"><X size={22} /></button>
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={openImageTextTool} className={cn(STORY_TOOL_BUTTON_CLASS, storyDraft.textOverlay && "bg-white/[0.18]")}><Type size={21} /></button>
              <button type="button" onClick={() => updateStoryTextOverlay((o) => ({ ...o, color: storyTextColors[(storyTextColors.indexOf(o.color) + 1) % storyTextColors.length] ?? "#ffffff" }))} className={STORY_TOOL_BUTTON_CLASS}><Palette size={21} /></button>
              <button type="button" onClick={addOrCycleSticker} disabled={storyDraft.mediaType === "video"} className={cn(STORY_TOOL_BUTTON_CLASS, storyDraft.sticker && "bg-white/[0.18]")}><Smile size={21} /></button>
              <button type="button" onClick={toggleDrawingMode} disabled={storyDraft.mediaType === "video"} className={cn(STORY_TOOL_BUTTON_CLASS, storyDraft.drawingMode && "bg-[#2AABEE]")}><PenLine size={21} /></button>
              <button type="button" onClick={deleteSelectedDraftElement} disabled={!selectedDraftElement && !storyDraft.textOverlay && !storyDraft.sticker && !storyDraft.drawStrokes?.length} className={STORY_TOOL_BUTTON_CLASS}><Trash2 size={21} /></button>
            </div>
          </div>

          <div className="chat-safe-scroll absolute inset-x-0 bottom-0 z-[35] max-h-[56dvh] overflow-y-auto bg-gradient-to-t from-black/75 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-16">
            {storyDraft.mediaType === "video" ? (
              <div className="mb-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-white backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-semibold">Trim story</span><span className={cn("text-xs font-medium", draftTrimLength > 30.1 ? "text-amber-200" : "text-white/60")}>{formatStoryTrimTime(draftTrimStart)} - {formatStoryTrimTime(draftTrimEnd)}</span></div>
                <div className="grid gap-2">
                  <label className="grid grid-cols-[3.25rem_1fr] items-center gap-3 text-[11px] text-white/55">Start<input type="range" min={0} max={Math.max(1, draftVideoDuration - 1)} step={0.1} value={draftTrimStart} onChange={(e) => updateVideoTrimStart(Number(e.target.value))} className="w-full" style={{ accentColor: "#2AABEE" }} /></label>
                  <label className="grid grid-cols-[3.25rem_1fr] items-center gap-3 text-[11px] text-white/55">End<input type="range" min={Math.min(draftVideoDuration, draftTrimStart + 1)} max={draftVideoDuration} step={0.1} value={Math.min(draftVideoDuration, draftTrimEnd)} onChange={(e) => updateVideoTrimEnd(Number(e.target.value))} className="w-full" style={{ accentColor: "#2AABEE" }} /></label>
                </div>
              </div>
            ) : null}
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white backdrop-blur-xl">
              <span className="font-semibold">Your Story</span><span className="text-xs text-white/55">24h</span>
            </div>
            <button type="button" onClick={confirmStoryDraftUpload} disabled={createStoryMutation.isPending || storyPreparing || (storyDraft.mediaType === "text" && !storyDraft.caption.trim() && !storyDraft.textOverlay?.text.trim())} className="fc-telegram-touch flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#2AABEE] px-5 text-base font-semibold text-white transition hover:bg-[#3BB7F3] disabled:opacity-70">
              {storyPreparing ? "Preparing..." : createStoryMutation.isPending ? "Sharing..." : "Share to Story"}
            </button>
          </div>

          {textOverlayEditorOpen && storyDraft.textOverlay ? (
            <div className="absolute inset-0 z-[45] bg-black/60 text-white backdrop-blur-sm">
              <textarea autoFocus value={storyDraft.textOverlay.text} onChange={(e) => updateStoryTextOverlay((o) => ({ ...o, text: e.target.value.slice(0, 120) }))} className="absolute left-1/2 top-1/2 min-h-28 w-[82%] -translate-x-1/2 -translate-y-1/2 resize-none border-0 bg-transparent text-center font-bold leading-tight text-white outline-none" style={{ color: storyDraft.textOverlay.color, fontFamily: `${storyDraft.textOverlay.fontFamily}, Arial, sans-serif`, fontSize: storyDraft.textOverlay.fontSize, textAlign: storyDraft.textOverlay.align }} />
              <div className="absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] px-4">
                {storyDraft.mediaType === "text" ? (
                  <div className="mb-3 flex justify-center gap-2.5">
                    {storyBackgroundColors.map((color) => (
                      <button key={color} type="button" onClick={() => setStoryDraft((d) => d ? { ...d, backgroundColor: color } : d)} style={{ width: 34, height: 34, borderRadius: "50%", background: color, border: storyDraft.backgroundColor === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.32)" }} />
                    ))}
                  </div>
                ) : null}
                <div className="flex justify-center gap-2.5">
                  {(["Inter", "Georgia", "Impact"] as const).map((font) => (
                    <button key={font} type="button" onClick={() => updateStoryTextOverlay((o) => ({ ...o, fontFamily: font }))} style={{ borderRadius: 16, padding: "8px 12px", background: storyDraft.textOverlay?.fontFamily === font ? "#2AABEE" : "rgba(255,255,255,0.16)", color: "#fff" }}>{font}</button>
                  ))}
                </div>
                <div className="mt-3 flex justify-center gap-2.5">
                  {storyTextColors.map((color) => (
                    <button key={color} type="button" onClick={() => updateStoryTextOverlay((o) => ({ ...o, color }))} style={{ width: 30, height: 30, borderRadius: "50%", background: color, border: storyDraft.textOverlay?.color === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.35)" }} />
                  ))}
                  {(["left", "center", "right"] as const).map((align) => {
                    const Icon = align === "left" ? AlignLeft : align === "right" ? AlignRight : AlignCenter;
                    return ( <button key={align} type="button" onClick={() => updateStoryTextOverlay((o) => ({ ...o, align }))} style={{ width: 30, height: 30, borderRadius: 10, background: storyDraft.textOverlay?.align === align ? "#2AABEE" : "rgba(255,255,255,0.16)", color: "#fff" }}><Icon size={16} /></button> );
                  })}
                </div>
                <input type="range" min={22} max={58} value={storyDraft.textOverlay.fontSize} onChange={(e) => updateStoryTextOverlay((o) => ({ ...o, fontSize: Number(e.target.value) }))} className="mt-4 w-full" style={{ accentColor: "#2AABEE" }} />
              </div>
              <button type="button" onClick={() => setTextOverlayEditorOpen(false)} className="absolute right-4 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 text-sm font-semibold text-white backdrop-blur-xl"><Check size={18} />Done</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
});

StoryCreator.displayName = "StoryCreator";
