"use client";
import { generateId } from "@/lib/uuid";

import { useEffect, useMemo, useRef, useState } from "react";

import { AlertCircle, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useStoriesQuery } from "@/hooks/queries/use-stories-query";
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
import type { Story } from "@/types/story";

import StoryViewer from "./story-viewer";

type StoryGroup = {
  userId: string;
  user: Story["user"];
  stories: Story[];
  hasUnseen: boolean;
};

type StoryUploadInput = {
  file: File;
  optimisticId: string;
  previewUrl: string;
  caption: string;
};

type FailedStoryUpload = {
  file: File;
  caption: string;
  message: string;
  previewUrl: string;
};

type StoryDraft = {
  file: File;
  previewUrl: string;
  mediaType: "image" | "video";
  caption: string;
};

function groupStories(stories: Story[], currentUserId?: string) {
  const groups = new Map<string, StoryGroup>();
  const now = Date.now();

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

export default function StoryTray() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedStoryUpload, setFailedStoryUpload] =
    useState<FailedStoryUpload | null>(null);
  const [storyDraft, setStoryDraft] =
    useState<StoryDraft | null>(null);
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const storyErrorShownRef = useRef(false);
  const failedStoryUploadRef = useRef<FailedStoryUpload | null>(null);
  const storyDraftRef = useRef<StoryDraft | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const pushToast = useToastStore((state) => state.pushToast);
  const storiesQuery = useStoriesQuery();

  const storyGroups = useMemo(
    () => groupStories(storiesQuery.data ?? [], currentUserId),
    [currentUserId, storiesQuery.data],
  );

  const createStoryMutation = useMutation({
    mutationFn: async ({ file, caption }: StoryUploadInput) => {
      if (!currentUser) {
        throw new Error("Please sign in again before publishing a story.");
      }

      const validationError = getUploadValidationError(file);

      if (validationError) {
        throw new Error(validationError);
      }

      if (file.type.startsWith("video/")) {
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
      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      return createStory({
        mediaUrl,
        mediaType,
        caption: caption.trim() || undefined,
      });
    },
    onMutate: ({ file, optimisticId, previewUrl, caption }) => {
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
        mediaUrl: previewUrl,
        mediaType: file.type.startsWith("video/") ? "video" : "image",
        caption: caption.trim(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        viewed: true,
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
        mediaType: file.type.startsWith("video/") ? "video" : "image",
        caption: "",
      };
    });
  }

  function publishStory(file: File, caption: string, previewUrl: string) {
    createStoryMutation.mutate({
      file,
      optimisticId: `optimistic-story-${generateId()}`,
      previewUrl,
      caption,
    });
  }

  function confirmStoryDraftUpload() {
    if (!storyDraft || createStoryMutation.isPending) {
      return;
    }

    const draft = storyDraft;

    setStoryDraft(null);
    publishStory(draft.file, draft.caption, draft.previewUrl);
  }

  function cancelStoryDraft() {
    if (storyDraft?.previewUrl) {
      URL.revokeObjectURL(storyDraft.previewUrl);
    }

    setStoryDraft(null);

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
    publishStory(failed.file, failed.caption, failed.previewUrl);
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
        accept="image/*,video/*"
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
          <span className="truncate">Add</span>
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
                ? "You"
                : formatDisplayName(group.user.username)}
            </span>
          </motion.button>
        ))}
      </div>

      {failedStoryUpload ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.08] p-3 text-sm text-red-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/25">
            {failedStoryUpload.file.type.startsWith("image/") ? (
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
        <div className="fixed inset-0 z-[255] flex items-center justify-center bg-black/70 p-3 text-white backdrop-blur-xl sm:p-6">
          <motion.div
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 18,
                    scale: 0.96,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            className="flex h-[min(760px,92dvh)] w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#080B14] shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-sm font-semibold">New story</h3>

              <button
                type="button"
                onClick={cancelStoryDraft}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
                aria-label="Close story preview"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-black">
              {storyDraft.mediaType === "video" ? (
                <video
                  src={storyDraft.previewUrl}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={storyDraft.previewUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            <div className="border-t border-white/10 bg-[#0B111C]/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <textarea
                value={storyDraft.caption}
                onChange={(event) =>
                  setStoryDraft((draft) =>
                    draft
                      ? {
                          ...draft,
                          caption: event.target.value.slice(0, 220),
                        }
                      : draft,
                  )
                }
                maxLength={220}
                rows={2}
                placeholder="Add a caption..."
                className="max-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-zinc-500 focus:border-purple-300/40 focus:bg-white/[0.08]"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500">
                  {storyDraft.caption.length}/220
                </span>

                <button
                  type="button"
                  onClick={confirmStoryDraftUpload}
                  disabled={createStoryMutation.isPending}
                  className="flex h-11 min-w-24 items-center justify-center rounded-2xl bg-purple-500 px-5 text-sm font-semibold text-white shadow-xl shadow-purple-500/25 transition hover:bg-purple-400 disabled:cursor-wait disabled:opacity-70"
                >
                  {createStoryMutation.isPending ? (
                    <Loader2
                      size={17}
                      className="motion-safe:animate-spin"
                    />
                  ) : (
                    "Post"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}

      <StoryViewer
        group={viewerGroup}
        groups={storyGroups}
        groupIndex={viewerGroupIndex}
        onGroupIndexChange={setViewerGroupIndex}
        onClose={() => setViewerGroupIndex(null)}
      />
    </section>
  );
}
