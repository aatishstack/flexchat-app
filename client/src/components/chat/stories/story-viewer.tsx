"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
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
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import FlexAvatar from "@/components/chat/flex-avatar";
import { formatDisplayName } from "@/lib/user-display";
import {
  deleteStory,
  getStoryViewers,
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
  const [progress, setProgress] =
    useState(0);
  const [isPaused, setIsPaused] =
    useState(false);
  const [
    deleteConfirmOpen,
    setDeleteConfirmOpen,
  ] = useState(false);
  const [
    viewerListOpen,
    setViewerListOpen,
  ] = useState(false);
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
  const progressRef =
    useRef(0);
  const videoRef =
    useRef<HTMLVideoElement | null>(null);
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
  const currentStoryId =
    currentStory?.id;
  const currentStoryMediaType =
    currentStory?.mediaType;
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

  const storyViewersQuery =
    useQuery({
      enabled:
        !!currentStoryId &&
        isOwnStory &&
        viewerListOpen,
      queryKey: [
        ...queryKeys.stories.all,
        currentStoryId,
        "viewers",
      ],
      queryFn: () =>
        getStoryViewers(
          currentStoryId ?? ""
        ),
      staleTime: 10 * 1000,
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
        setDeleteConfirmOpen(false);
        setViewerListOpen(false);
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
    if (!currentStoryId) {
      return;
    }

    progressRef.current = 0;

    const frameId =
      requestAnimationFrame(() => {
        setProgress(0);
        setIsPaused(false);
      });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [currentStoryId]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!currentStoryId || isPaused) {
      return;
    }

    let frameId = 0;
    let previousFrameTime =
      performance.now();

    function tick(frameTime: number) {
      const elapsed =
        frameTime - previousFrameTime;
      previousFrameTime = frameTime;

      const nextProgress = Math.min(
        1,
        progressRef.current +
          elapsed / duration
      );

      progressRef.current =
        nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        goNext();
        return;
      }

      frameId =
        requestAnimationFrame(tick);
    }

    frameId =
      requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    currentStoryId,
    duration,
    isPaused,
    goNext,
  ]);

  useEffect(() => {
    if (
      currentStoryMediaType !== "video" ||
      !videoRef.current
    ) {
      return;
    }

    if (isPaused) {
      videoRef.current.pause();
      return;
    }

    void videoRef.current.play().catch(() => undefined);
  }, [
    currentStoryId,
    currentStoryMediaType,
    isPaused,
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
          style={{
            width:
              index < storyIndex
                ? "100%"
                : index === storyIndex
                  ? `${Math.round(progress * 100)}%`
                  : "0%",
          }}
          className="h-full rounded-full bg-white"
        />
      </div>
    ));
  }, [
    group,
    progress,
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
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerCancel={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
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
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setViewerListOpen(true)
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
                        aria-label="Show story viewers"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirmOpen(true)
                        }
                        disabled={
                          deleteStoryMutation.isPending
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-red-500/30 disabled:cursor-wait disabled:opacity-60"
                        aria-label="Delete story"
                      >
                        <Trash2 size={17} />
                      </button>
                    </>
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
                ref={videoRef}
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

            <AnimatePresence>
              {viewerListOpen && isOwnStory ? (
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
                  className="absolute inset-0 z-40 flex items-end bg-black/45 backdrop-blur-md"
                  onClick={() =>
                    setViewerListOpen(false)
                  }
                >
                  <motion.div
                    initial={{
                      y: "100%",
                    }}
                    animate={{
                      y: 0,
                    }}
                    exit={{
                      y: "100%",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 30,
                    }}
                    className="max-h-[60%] w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0B111C]/95 shadow-[0_-24px_80px_rgba(0,0,0,0.55)]"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Viewed by
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {storyViewersQuery.data?.length ?? 0} views
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setViewerListOpen(false)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10"
                        aria-label="Close viewers"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="chat-safe-scroll max-h-[calc(60dvh-5rem)] overflow-y-auto p-4">
                      {storyViewersQuery.isLoading ? (
                        <div className="flex h-24 items-center justify-center text-purple-200">
                          <Loader2
                            size={18}
                            className="motion-safe:animate-spin"
                          />
                        </div>
                      ) : null}

                      {!storyViewersQuery.isLoading &&
                      !storyViewersQuery.data?.length ? (
                        <div className="flex h-24 items-center justify-center text-center text-sm text-zinc-500">
                          No views yet
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        {storyViewersQuery.data?.map((viewer) => (
                          <div
                            key={viewer.id}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                          >
                            <FlexAvatar
                              src={viewer.avatar}
                              name={viewer.username}
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-sm font-bold"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {formatDisplayName(viewer.username)}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {formatStoryTime(viewer.viewedAt)} ago
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {deleteConfirmOpen && currentStory ? (
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
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-xl"
                >
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 16,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: 16,
                      scale: 0.96,
                    }}
                    className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0B111C]/95 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/15 text-red-100">
                        <AlertTriangle size={21} />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">
                          Delete story?
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                          This story will be removed for everyone.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirmOpen(false)
                        }
                        disabled={
                          deleteStoryMutation.isPending
                        }
                        className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60"
                      >
                        Cancel
                      </button>

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
                        className="flex h-12 items-center justify-center rounded-2xl bg-red-500 text-sm font-semibold text-white shadow-xl shadow-red-500/25 transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-70"
                      >
                        {deleteStoryMutation.isPending ? (
                          <Loader2
                            size={18}
                            className="motion-safe:animate-spin"
                          />
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
