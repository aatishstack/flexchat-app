"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import FlexAvatar from "@/components/chat/flex-avatar";
import { formatDisplayName } from "@/lib/user-display";
import {
  deleteStory,
  markStoryViewed,
} from "@/services/story.service";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";
import type { Story } from "@/types/story";

type StoryGroup = {
  userId: string;
  user: Story["user"];
  stories: Story[];
  hasUnseen: boolean;
};

type Props = {
  group: StoryGroup | null;
  groups: StoryGroup[];
  groupIndex: number | null;
  onGroupIndexChange: (
    index: number | null
  ) => void;
  onClose: () => void;
};

const STORY_DURATION_MS = 5500;
const VIDEO_FALLBACK_DURATION_MS = 12000;

function formatStoryTime(value?: string) {
  if (!value) {
    return "";
  }

  const diffMs =
    Date.now() -
    new Date(value).getTime();
  const diffMinutes =
    Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  return `${Math.round(diffMinutes / 60)}h`;
}

export default function StoryViewer({
  group,
  groups,
  groupIndex,
  onGroupIndexChange,
  onClose,
}: Props) {
  const [storyIndex, setStoryIndex] =
    useState(0);
  const [
    videoDuration,
    setVideoDuration,
  ] = useState(
    {
      storyId: "",
      durationMs:
        VIDEO_FALLBACK_DURATION_MS,
    }
  );
  const reducedMotion =
    useReducedMotion();
  const queryClient = useQueryClient();
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const currentUserId =
    useAuthStore(
      (state) => state.user?.id
    );

  const currentStory =
    group?.stories[storyIndex] ?? null;
  const isOwnStory =
    currentStory?.userId === currentUserId;
  const duration =
    currentStory?.mediaType === "video"
      ? videoDuration.storyId ===
        currentStory.id
        ? videoDuration.durationMs
        : VIDEO_FALLBACK_DURATION_MS
      : STORY_DURATION_MS;

  const {
    mutate: markStoryAsViewed,
  } = useMutation({
      mutationFn: markStoryViewed,
      onSuccess: (_, storyId) => {
        queryClient.setQueryData<Story[]>(
          queryKeys.stories.all,
          (stories) =>
            stories?.map((story) =>
              story.id === storyId
                ? {
                    ...story,
                    viewed: true,
                  }
                : story
            ) ?? []
        );
      },
    });

  const deleteStoryMutation =
    useMutation({
      mutationFn: deleteStory,
      onSuccess: (_, storyId) => {
        queryClient.setQueryData<Story[]>(
          queryKeys.stories.all,
          (stories) =>
            (stories ?? []).filter(
              (story) => story.id !== storyId
            )
        );
        onClose();
        pushToast({
          title: "Story deleted",
          message:
            "Your story has been removed.",
          variant: "success",
        });
      },
      onError: () => {
        pushToast({
          title:
            "Stories temporarily unavailable",
          message:
            "We could not delete that story right now.",
          variant: "error",
        });
      },
    });

  const goNext = useCallback(() => {
    if (!group || groupIndex === null) {
      return;
    }

    if (
      storyIndex <
      group.stories.length - 1
    ) {
      setStoryIndex((index) => index + 1);
      return;
    }

    if (groupIndex < groups.length - 1) {
      onGroupIndexChange(groupIndex + 1);
      setStoryIndex(0);
      return;
    }

    onClose();
  }, [
    group,
    groupIndex,
    groups.length,
    onClose,
    onGroupIndexChange,
    storyIndex,
  ]);

  const goPrevious = useCallback(() => {
    if (!group || groupIndex === null) {
      return;
    }

    if (storyIndex > 0) {
      setStoryIndex((index) => index - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup =
        groups[groupIndex - 1];

      onGroupIndexChange(groupIndex - 1);
      setStoryIndex(
        Math.max(
          0,
          previousGroup.stories.length - 1
        )
      );
    }
  }, [
    group,
    groupIndex,
    groups,
    onGroupIndexChange,
    storyIndex,
  ]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setStoryIndex(0);
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);
    };
  }, [group?.userId]);

  useEffect(() => {
    if (
      !currentStory ||
      currentStory.viewed ||
      currentStory.userId === currentUserId
    ) {
      return;
    }

    markStoryAsViewed(currentStory.id);
  }, [
    currentStory,
    currentUserId,
    markStoryAsViewed,
  ]);

  useEffect(() => {
    if (!currentStory) {
      return;
    }

    const timer = setTimeout(
      goNext,
      duration
    );

    return () => {
      clearTimeout(timer);
    };
  }, [
    currentStory,
    duration,
    goNext,
  ]);

  const progressBars = useMemo(() => {
    if (!group) {
      return null;
    }

    return group.stories.map((story, index) => (
      <div
        key={story.id}
        className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
      >
        <motion.div
          key={`${story.id}:${storyIndex}`}
          initial={{
            width:
              index < storyIndex
                ? "100%"
                : "0%",
          }}
          animate={{
            width:
              index < storyIndex
                ? "100%"
                : index === storyIndex
                  ? "100%"
                  : "0%",
          }}
          transition={{
            duration:
              reducedMotion ||
              index !== storyIndex
                ? 0
                : duration / 1000,
            ease: "linear",
          }}
          className="h-full rounded-full bg-white"
        />
      </div>
    ));
  }, [
    duration,
    group,
    reducedMotion,
    storyIndex,
  ]);

  return (
    <AnimatePresence>
      {group && currentStory ? (
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
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/[0.86] p-3 text-white backdrop-blur-xl sm:p-6"
        >
          <motion.div
            initial={
              reducedMotion
                ? false
                : {
                    scale: 0.96,
                    y: 18,
                  }
            }
            animate={{
              scale: 1,
              y: 0,
            }}
            exit={
              reducedMotion
                ? undefined
                : {
                    scale: 0.96,
                    y: 18,
                  }
            }
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 28,
            }}
            drag="x"
            dragConstraints={{
              left: 0,
              right: 0,
            }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (
                info.offset.x < -70 ||
                info.velocity.x < -520
              ) {
                goNext();
                return;
              }

              if (
                info.offset.x > 70 ||
                info.velocity.x > 520
              ) {
                goPrevious();
              }
            }}
            className="relative h-[min(760px,92dvh)] w-full max-w-[430px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080B14] shadow-[0_28px_90px_rgba(0,0,0,0.6)]"
          >
            <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/20 to-transparent px-4 pb-8 pt-[calc(1rem+env(safe-area-inset-top))]">
              <div className="flex gap-1.5">
                {progressBars}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FlexAvatar
                    src={group.user.avatar}
                    name={group.user.username}
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-sm font-bold"
                  />

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {isOwnStory
                        ? "Your story"
                        : formatDisplayName(
                            group.user.username
                          )}
                    </h3>
                    <p className="text-xs text-white/60">
                      {formatStoryTime(
                        currentStory.createdAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwnStory ? (
                    <button
                      type="button"
                      onClick={() =>
                        deleteStoryMutation.mutate(
                          currentStory.id
                        )
                      }
                      disabled={
                        deleteStoryMutation.isPending
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-red-500/30 disabled:cursor-wait disabled:opacity-60"
                      aria-label="Delete story"
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Close stories"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={goPrevious}
              className="absolute left-0 top-0 z-10 h-full w-1/3"
              aria-label="Previous story"
            />
            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 top-0 z-10 h-full w-1/3"
              aria-label="Next story"
            />

            {currentStory.mediaType === "video" ? (
              <video
                key={currentStory.id}
                src={currentStory.mediaUrl}
                autoPlay
                playsInline
                controls={false}
                onLoadedMetadata={(event) => {
                  const durationSeconds =
                    event.currentTarget.duration;

                  if (
                    Number.isFinite(
                      durationSeconds
                    ) &&
                    durationSeconds > 0
                  ) {
                    setVideoDuration({
                      storyId:
                        currentStory.id,
                      durationMs:
                        Math.min(
                          Math.max(
                            durationSeconds * 1000,
                            2500
                          ),
                          30000
                        ),
                    });
                  }
                }}
                onEnded={goNext}
                onError={goNext}
                className="h-full w-full bg-black object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={currentStory.id}
                src={currentStory.mediaUrl}
                alt=""
                onError={goNext}
                className="h-full w-full bg-black object-cover"
              />
            )}

            {currentStory.caption ? (
              <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-16">
                <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed backdrop-blur-xl">
                  {currentStory.caption}
                </p>
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-y-0 left-3 z-20 hidden items-center sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-xl">
                <ChevronLeft size={19} />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-3 z-20 hidden items-center sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-xl">
                <ChevronRight size={19} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
