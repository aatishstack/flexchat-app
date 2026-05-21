"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  Plus,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { useStoriesQuery } from "@/hooks/queries/use-stories-query";
import { queryKeys } from "@/lib/query-keys";
import {
  formatDisplayName,
  getAvatarInitial,
} from "@/lib/user-display";
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

function groupStories(
  stories: Story[],
  currentUserId?: string
) {
  const groups = new Map<string, StoryGroup>();

  [...stories]
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime()
    )
    .forEach((story) => {
      const existing = groups.get(story.userId);

      if (existing) {
        existing.stories.push(story);
        existing.hasUnseen =
          existing.hasUnseen ||
          (!story.viewed &&
            story.userId !== currentUserId);
        return;
      }

      groups.set(story.userId, {
        userId: story.userId,
        user: story.user,
        stories: [story],
        hasUnseen:
          !story.viewed &&
          story.userId !== currentUserId,
      });
    });

  return Array.from(groups.values()).sort(
    (left, right) => {
      if (left.userId === currentUserId) {
        return -1;
      }

      if (right.userId === currentUserId) {
        return 1;
      }

      const leftTime = new Date(
        left.stories[left.stories.length - 1]
          ?.createdAt ?? 0
      ).getTime();
      const rightTime = new Date(
        right.stories[right.stories.length - 1]
          ?.createdAt ?? 0
      ).getTime();

      return rightTime - leftTime;
    }
  );
}

function avatarLabel(storyGroup: StoryGroup) {
  return getAvatarInitial(
    storyGroup.user.username
  );
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
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);
  const [viewerGroupIndex, setViewerGroupIndex] =
    useState<number | null>(null);
  const reducedMotion =
    useReducedMotion();
  const queryClient = useQueryClient();
  const storyErrorShownRef =
    useRef(false);
  const currentUserId =
    useAuthStore(
      (state) => state.user?.id
    );
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const storiesQuery = useStoriesQuery();

  const storyGroups = useMemo(
    () =>
      groupStories(
        storiesQuery.data ?? [],
        currentUserId
      ),
    [
      currentUserId,
      storiesQuery.data,
    ]
  );

  const createStoryMutation =
    useMutation({
      mutationFn: async (file: File) => {
        const validationError =
          getUploadValidationError(file);

        if (validationError) {
          throw new Error(validationError);
        }

        if (file.type.startsWith("video/")) {
          const duration =
            await getVideoDurationSeconds(file);

          if (
            Number.isFinite(duration) &&
            duration > 30
          ) {
            throw new Error(
              "Story videos must be 30 seconds or shorter."
            );
          }
        }

        const mediaUrl =
          await uploadImage(file);
        const mediaType =
          file.type.startsWith("video/")
            ? "video"
            : "image";

        return createStory({
          mediaUrl,
          mediaType,
        });
      },
      onSuccess: (story) => {
        queryClient.setQueryData<Story[]>(
          queryKeys.stories.all,
          (currentStories) => [
            story,
            ...(currentStories ?? []).filter(
              (item) => item.id !== story.id
            ),
          ]
        );
        pushToast({
          title: "Story published",
          message:
            "Your story is now live for your conversations.",
          variant: "success",
        });
      },
      onError: (error) => {
        pushToast({
          title:
            "Couldn't upload story",
          message:
            error instanceof Error
              ? error.message
              : "Please try again in a moment.",
          variant: "error",
        });
      },
      onSettled: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });

  useEffect(() => {
    if (storiesQuery.isError) {
      if (!storyErrorShownRef.current) {
        storyErrorShownRef.current = true;
        pushToast({
          title:
            "Stories temporarily unavailable",
          message:
            "We could not refresh stories right now.",
          variant: "error",
        });
      }

      return;
    }

    if (storiesQuery.isSuccess) {
      storyErrorShownRef.current = false;
    }
  }, [
    storiesQuery.isError,
    storiesQuery.isSuccess,
    pushToast,
  ]);

  const viewerGroup =
    viewerGroupIndex === null
      ? null
      : storyGroups[viewerGroupIndex] ?? null;

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Stories
        </h2>

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
          const file =
            event.target.files?.[0];

          if (file) {
            createStoryMutation.mutate(file);
          }
        }}
      />

      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={createStoryMutation.isPending}
          className="flex w-[64px] shrink-0 flex-col items-center gap-2 text-center text-[11px] text-zinc-400 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-purple-400/40 bg-purple-500/10 text-purple-100 shadow-lg shadow-purple-950/20">
            {createStoryMutation.isPending ? (
              <Loader2
                size={18}
                className="motion-safe:animate-spin"
              />
            ) : (
              <Plus size={18} />
            )}
          </span>
          <span className="truncate">
            Add
          </span>
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
            onClick={() =>
              setViewerGroupIndex(index)
            }
            className="flex w-[64px] shrink-0 flex-col items-center gap-2 text-center text-[11px] text-zinc-400"
          >
            <span
              className={`relative flex h-14 w-14 items-center justify-center rounded-2xl p-[2px] ${
                group.hasUnseen
                  ? "bg-gradient-to-tr from-purple-500 via-fuchsia-500 to-cyan-300 shadow-lg shadow-purple-500/20"
                  : "bg-white/10"
              }`}
            >
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#0B111C] text-base font-bold text-white">
                {group.user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={group.user.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarLabel(group)
                )}
              </span>
            </span>
            <span className="w-full truncate">
              {group.userId === currentUserId
                ? "You"
                : formatDisplayName(
                    group.user.username
                  )}
            </span>
          </motion.button>
        ))}
      </div>

      <StoryViewer
        group={viewerGroup}
        groups={storyGroups}
        groupIndex={viewerGroupIndex}
        onGroupIndexChange={
          setViewerGroupIndex
        }
        onClose={() =>
          setViewerGroupIndex(null)
        }
      />
    </section>
  );
}
