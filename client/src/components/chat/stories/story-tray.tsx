"use client";
import { generateId } from "@/lib/uuid";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlertCircle,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Type,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useStoriesQuery } from "@/hooks/queries/use-stories-query";
import { useServerNow } from "@/hooks/use-server-now";
import FlexAvatar from "@/components/chat/flex-avatar";
import { queryKeys } from "@/lib/query-keys";
import { formatDisplayName } from "@/lib/user-display";
import { createStory } from "@/services/story.service";
import {
  getUploadValidationError,
  uploadImage,
} from "@/services/upload.service";
import { useToastStore } from "@/store/toast-store";
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

type StoryDraft = {
  file?: File;
  previewUrl?: string;
  mediaType: "image" | "video" | "text";
  caption: string;
  textOverlay?: StoryTextOverlay;
};

const TEXT_STORY_MEDIA_URL = "flexchat://story/text";
const MUTED_STORY_USERS_KEY = "flexchat:muted-story-users";
const STORY_TEXT_COLORS = ["#ffffff", "#fbbf24", "#60a5fa", "#fb7185", "#34d399"];

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

function getStoryMediaType(file: File): "image" | "video" {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (
    file.type.startsWith("video/") ||
    ["mov", "mp4", "m4v", "3gp", "3gpp", "3g2", "3gpp2", "webm"].includes(
      extension ?? "",
    )
  ) {
    return "video";
  }

  return "image";
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

async function bakeStoryTextOverlay(file: File, overlay: StoryTextOverlay) {
  const text = overlay.text.trim();

  if (!text) {
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

    const fontSize = Math.round(
      Math.max(22, Math.min(96, overlay.fontSize * (width / 390))),
    );
    const lineHeight = fontSize * 1.22;
    const maxTextWidth = width * 0.78;
    const x = (overlay.x / 100) * width;
    const y = (overlay.y / 100) * height;

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

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "story"}.png`, {
      type: "image/png",
      lastModified: getServerNow(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function StoryTray() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storyCanvasRef = useRef<HTMLDivElement | null>(null);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedStoryUpload, setFailedStoryUpload] =
    useState<FailedStoryUpload | null>(null);
  const [storyDraft, setStoryDraft] =
    useState<StoryDraft | null>(null);
  const [textOverlayEditorOpen, setTextOverlayEditorOpen] = useState(false);
  const [overlayDragging, setOverlayDragging] = useState(false);
  const [mutedStoryUserIds, setMutedStoryUserIds] = useState<Set<string>>(
    readMutedStoryUserIds,
  );
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const storyErrorShownRef = useRef(false);
  const failedStoryUploadRef = useRef<FailedStoryUpload | null>(null);
  const storyDraftRef = useRef<StoryDraft | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const now = useServerNow();
  const pushToast = useToastStore((state) => state.pushToast);
  const storiesQuery = useStoriesQuery();

  const storyGroups = useMemo(
    () =>
      groupStories(storiesQuery.data ?? [], currentUserId, now).filter(
        (group) =>
          group.userId === currentUserId || !mutedStoryUserIds.has(group.userId),
      ),
    [currentUserId, mutedStoryUserIds, now, storiesQuery.data],
  );

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

      const validationError = getUploadValidationError(file);

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

    const validationError = getUploadValidationError(file);

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

    setTextOverlayEditorOpen(false);
    setOverlayDragging(false);

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
        mediaType: getStoryMediaType(file),
        caption: "",
      };
    });
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

    setStoryDraft((currentDraft) => {
      if (currentDraft?.previewUrl) {
        URL.revokeObjectURL(currentDraft.previewUrl);
      }

      return {
        mediaType: "text",
        caption: "",
        textOverlay: DEFAULT_STORY_TEXT_OVERLAY,
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

  function publishStory(draft: StoryDraft) {
    createStoryMutation.mutate({
      file: draft.file,
      optimisticId: `optimistic-story-${generateId()}`,
      previewUrl: draft.previewUrl,
      mediaType: draft.mediaType,
      caption: draft.caption,
    });
  }

  async function confirmStoryDraftUpload() {
    if (!storyDraft || createStoryMutation.isPending) {
      return;
    }

    const draft = storyDraft;
    let uploadDraft = draft;

    if (
      draft.mediaType === "image" &&
      draft.file &&
      draft.textOverlay?.text.trim()
    ) {
      try {
        const bakedFile = await bakeStoryTextOverlay(draft.file, draft.textOverlay);
        const bakedPreviewUrl = URL.createObjectURL(bakedFile);

        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }

        uploadDraft = {
          ...draft,
          file: bakedFile,
          previewUrl: bakedPreviewUrl,
          textOverlay: undefined,
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
        return;
      }
    }

    if (draft.mediaType === "text" && draft.textOverlay?.text.trim()) {
      uploadDraft = {
        ...uploadDraft,
        caption: draft.textOverlay.text.trim().slice(0, 220),
      };
    }

    setStoryDraft(null);
    setTextOverlayEditorOpen(false);
    setOverlayDragging(false);
    publishStory(uploadDraft);
  }

  function cancelStoryDraft() {
    if (storyDraft?.previewUrl) {
      URL.revokeObjectURL(storyDraft.previewUrl);
    }

    setStoryDraft(null);
    setTextOverlayEditorOpen(false);
    setOverlayDragging(false);

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
    publishStory({
      file: failed.file,
      previewUrl: failed.previewUrl,
      mediaType: failed.mediaType,
      caption: failed.caption,
    });
  }

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
      message: "Stories from this person are hidden on this device.",
      variant: "info",
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

  const viewerGroup =
    viewerGroupIndex === null ? null : (storyGroups[viewerGroupIndex] ?? null);

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Stories</h2>

        {storiesQuery.isFetching ? (
          <Loader2
            size={14}
            className="text-purple-300 motion-safe:animate-spin"
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

      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={createStoryMutation.isPending}
          className="flex w-[64px] shrink-0 flex-col items-center gap-2 text-center text-[11px] text-zinc-400 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-purple-400/40 bg-purple-500/10 text-purple-100 shadow-lg shadow-purple-950/20">
            {createStoryMutation.isPending ? (
              <>
                <Loader2 size={18} className="motion-safe:animate-spin" />
                <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/15">
                  <span
                    className="block h-full rounded-full bg-purple-200 transition-[width]"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </span>
              </>
            ) : (
              <Plus size={18} />
            )}
          </span>
          <span className="truncate">Media</span>
        </button>

        <button
          type="button"
          onClick={openTextStoryDraft}
          disabled={createStoryMutation.isPending}
          className="flex w-[64px] shrink-0 flex-col items-center gap-2 text-center text-[11px] text-zinc-400 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/25 bg-white/[0.06] text-purple-100 shadow-lg shadow-black/15">
            <Type size={18} />
          </span>
          <span className="truncate">Text</span>
        </button>

        {storyGroups.map((group, index) => (
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
            onClick={() => setViewerGroupIndex(index)}
            className="flex w-[64px] shrink-0 flex-col items-center gap-2 text-center text-[11px] text-zinc-400"
          >
            <span
              className={`relative flex h-14 w-14 items-center justify-center rounded-2xl p-[2px] ${
                group.hasUnseen
                  ? "bg-gradient-to-tr from-purple-500 via-fuchsia-500 to-cyan-300 shadow-lg shadow-purple-500/20"
                  : "bg-white/10"
              }`}
            >
              <FlexAvatar
                src={group.user.avatar}
                name={group.user.username}
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#0B111C] text-base font-bold text-white"
              />
            </span>
            <span className="w-full truncate">
              {group.userId === currentUserId
                ? "My Story"
                : formatDisplayName(group.user.username)}
            </span>
          </motion.button>
        ))}
      </div>

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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
            aria-label="Retry story upload"
          >
            <RefreshCw size={15} />
          </button>

          <button
            type="button"
            onClick={clearFailedStoryUpload}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition hover:bg-white/15"
            aria-label="Dismiss story upload error"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      {storyDraft ? (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 255 }}>
          <div ref={storyCanvasRef} style={{ position: "absolute", inset: 0 }}>
            {storyDraft.mediaType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storyDraft.previewUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : storyDraft.mediaType === "video" ? (
              <video
                src={storyDraft.previewUrl}
                autoPlay
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  background: "linear-gradient(135deg,#04363d,#0f172a 48%,#111827)",
                  width: "100%",
                  height: "100%",
                }}
              />
            )}

            {storyDraft.textOverlay && !textOverlayEditorOpen ? (
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setOverlayDragging(true);
                  moveStoryTextOverlay(event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (overlayDragging) {
                    moveStoryTextOverlay(event.clientX, event.clientY);
                  }
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }

                  setOverlayDragging(false);
                }}
                onPointerCancel={() => setOverlayDragging(false)}
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

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "48px 16px 16px",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
              display: "flex",
              gap: 20,
              alignItems: "center",
              color: "#fff",
              zIndex: 35,
              transition: "opacity 180ms ease",
            }}
          >
            <button type="button" onClick={cancelStoryDraft} aria-label="Close">
              <X size={22} />
            </button>
            <button type="button" onClick={openImageTextTool} aria-label="Text">
              Aa
            </button>
            <button
              type="button"
              onClick={() =>
                updateStoryTextOverlay((overlay) => ({
                  ...overlay,
                  color:
                    STORY_TEXT_COLORS[
                      (STORY_TEXT_COLORS.indexOf(overlay.color) + 1) %
                        STORY_TEXT_COLORS.length
                    ] ?? "#ffffff",
                }))
              }
              aria-label="Color"
            >
              🎨
            </button>
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: "Sticker picker",
                  message: "Sticker tools are ready for this draft.",
                  variant: "info",
                })
              }
            >
              Sticker
            </button>
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: "Timer picker",
                  message: "Stories expire after 24 hours.",
                  variant: "info",
                })
              }
              aria-label="Timer"
            >
              ⏱
            </button>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "16px 16px 32px",
              background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
              zIndex: 35,
            }}
          >
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <button
                type="button"
                style={{
                  borderRadius: 24,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                👤 Your Story
              </button>
              <button
                type="button"
                style={{
                  borderRadius: 24,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                ⭐ Close Friends
              </button>
            </div>
            <button
              type="button"
              onClick={confirmStoryDraftUpload}
              disabled={
                createStoryMutation.isPending ||
                (storyDraft.mediaType === "text" &&
                  !storyDraft.caption.trim() &&
                  !storyDraft.textOverlay?.text.trim())
              }
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 28,
                background: "#00BCD4",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                opacity: createStoryMutation.isPending ? 0.7 : 1,
              }}
            >
              {createStoryMutation.isPending ? "Sharing..." : "Share to Story"}
            </button>
          </div>

          {textOverlayEditorOpen && storyDraft.textOverlay ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 45,
                transition: "opacity 180ms ease",
              }}
            >
              <textarea
                autoFocus
                value={storyDraft.textOverlay.text}
                onChange={(event) =>
                  updateStoryTextOverlay((overlay) => ({
                    ...overlay,
                    text: event.target.value.slice(0, 120),
                  }))
                }
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  background: "transparent",
                  color: "#fff",
                  fontSize: storyDraft.textOverlay.fontSize,
                  textAlign: storyDraft.textOverlay.align,
                  border: "none",
                  outline: "none",
                  width: "80%",
                  resize: "none",
                  fontWeight: 700,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 80,
                  left: 0,
                  right: 0,
                  padding: "0 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
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
                        borderRadius: 18,
                        padding: "8px 12px",
                        background:
                          storyDraft.textOverlay?.fontFamily === font
                            ? "#00BCD4"
                            : "rgba(255,255,255,0.16)",
                        color: "#fff",
                      }}
                    >
                      {font}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 10 }}>
                  {STORY_TEXT_COLORS.map((color) => (
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
                              ? "#00BCD4"
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
                  style={{ marginTop: 18, width: "100%", accentColor: "#00BCD4" }}
                  aria-label="Font size"
                />
              </div>
              <button
                type="button"
                onClick={() => setTextOverlayEditorOpen(false)}
                style={{ position: "absolute", top: 50, right: 20, color: "#fff" }}
              >
                Done
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <StoryViewer
        group={viewerGroup}
        groups={storyGroups}
        groupIndex={viewerGroupIndex}
        onGroupIndexChange={setViewerGroupIndex}
        onMuteUser={muteStoryUser}
        onClose={() => setViewerGroupIndex(null)}
      />
    </section>
  );
}
