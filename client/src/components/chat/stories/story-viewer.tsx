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
  BellOff,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  SendHorizonal,
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
import { useServerNow } from "@/hooks/use-server-now";
import FlexAvatar from "@/components/chat/flex-avatar";
import { formatDisplayName } from "@/lib/user-display";
import {
  deleteStory,
  getStoryViewers,
  markStoryViewed,
} from "@/services/story.service";
import { createDirectConversation } from "@/services/conversation.service";
import { useToastStore } from "@/store/toast-store";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";
import {
  upsertConversationInQueryCache,
  type ConversationQueryCache,
} from "@/lib/conversation-query-cache";
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
  onMuteUser: (userId: string) => void;
  onClose: () => void;
};

const STORY_DURATION_MS = 5500;
const VIDEO_FALLBACK_DURATION_MS = 12000;

function formatStoryTime(value?: string, now = Date.now()) {
  if (!value) {
    return "";
  }

  const diffMs =
    now -
    new Date(value).getTime();
  const diffMinutes =
    Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  return `${Math.round(diffMinutes / 60)}h`;
}

function getStoryReplyPreview(story: Story) {
  const caption = story.caption?.trim();

  if (caption) {
    return `Story: ${caption.slice(0, 120)}`;
  }

  if (story.mediaType === "video") {
    return "Story: Video";
  }

  if (story.mediaType === "image") {
    return "Story: Photo";
  }

  return "Story";
}

export default function StoryViewer({
  group,
  groups,
  groupIndex,
  onGroupIndexChange,
  onMuteUser,
  onClose,
}: Props) {
  const [storyIndex, setStoryIndex] =
    useState(0);
  const [progress, setProgress] =
    useState(0);
  const [isPaused, setIsPaused] =
    useState(false);
  const [replyFocused, setReplyFocused] =
    useState(false);
  const [
    deleteConfirmOpen,
    setDeleteConfirmOpen,
  ] = useState(false);
  const [
    viewerListOpen,
    setViewerListOpen,
  ] = useState(false);
  const [replyText, setReplyText] =
    useState("");
  const [isSendingReply, setIsSendingReply] =
    useState(false);
  const [
    loadedMediaStoryId,
    setLoadedMediaStoryId,
  ] = useState<string | undefined>();
  const now = useServerNow();
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
  const videoEndedRef =
    useRef(false);
  const queryClient = useQueryClient();
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const sendSocketMessage =
    useSocketStore(
      (state) => state.sendMessage
    );
  const setActiveConversation =
    useConversationStore(
      (state) => state.setActiveConversation
    );
  const currentUserId =
    useAuthStore(
      (state) => state.user?.id
    );

  const effectiveStoryIndex = group
    ? Math.min(
        storyIndex,
        Math.max(group.stories.length - 1, 0),
      )
    : 0;
  const currentStory =
    group?.stories[effectiveStoryIndex] ?? null;
  const currentStoryId =
    currentStory?.id;
  const currentStoryMediaType =
    currentStory?.mediaType;
  const mediaLoading =
    (currentStoryMediaType === "image" ||
      currentStoryMediaType === "video") &&
    loadedMediaStoryId !== currentStoryId;
  const isOwnStory =
    currentStory?.userId === currentUserId;
  const timerPaused =
    isPaused ||
    replyFocused ||
    !!replyText.trim() ||
    isSendingReply ||
    deleteConfirmOpen ||
    viewerListOpen ||
    mediaLoading;
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
        isOwnStory,
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
      onMutate: async (storyId) => {
        await queryClient.cancelQueries({
          queryKey: queryKeys.stories.all,
        });
        const previousStories =
          queryClient.getQueryData<Story[]>(queryKeys.stories.all);

        queryClient.setQueryData<Story[]>(
          queryKeys.stories.all,
          (stories) =>
            (stories ?? []).filter(
              (story) => story.id !== storyId
            )
        );

        return {
          previousStories,
        };
      },
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
      onError: (_error, _storyId, context) => {
        if (context?.previousStories) {
          queryClient.setQueryData(
            queryKeys.stories.all,
            context.previousStories
          );
        }

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

  const handleStoryReply = useCallback(async () => {
    const story = currentStory;
    const text = replyText.trim();

    if (!story || isOwnStory || !text || isSendingReply) {
      return;
    }

    setIsSendingReply(true);

    try {
      const conversation = await createDirectConversation(story.userId);

      queryClient.setQueryData<ConversationQueryCache>(
        queryKeys.conversations.all,
        (cache) => upsertConversationInQueryCache(cache, conversation),
      );
      setActiveConversation(conversation);
      sendSocketMessage({
        conversationId: conversation.id,
        text,
        replyTo: {
          id: `story:${story.id}`,
          text: getStoryReplyPreview(story),
        },
      });
      setReplyText("");
      onClose();
      window.dispatchEvent(new CustomEvent("flexchat:conversation-selected"));
      pushToast({
        title: "Story reply sent",
        message: "Opened the direct message with your reply.",
        variant: "success",
      });
    } catch {
      pushToast({
        title: "Could not reply to story",
        message: "Please try again in a moment.",
        variant: "error",
      });
    } finally {
      setIsSendingReply(false);
    }
  }, [
    currentStory,
    isOwnStory,
    isSendingReply,
    onClose,
    pushToast,
    queryClient,
    replyText,
    sendSocketMessage,
    setActiveConversation,
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
    videoEndedRef.current = false;

    const frameId =
      requestAnimationFrame(() => {
        setProgress(0);
        setIsPaused(false);
      });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    currentStoryId,
    currentStoryMediaType,
  ]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!currentStoryId || timerPaused) {
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
        if (!videoEndedRef.current) {
          goNext();
        }

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
    timerPaused,
    goNext,
  ]);

  useEffect(() => {
    if (
      currentStoryMediaType !== "video" ||
      !videoRef.current
    ) {
      return;
    }

    if (timerPaused) {
      videoRef.current.pause();
      return;
    }

    void videoRef.current.play().catch(() => undefined);
  }, [
    currentStoryId,
    currentStoryMediaType,
    timerPaused,
  ]);

  useEffect(() => {
    const nextStory =
      group?.stories[storyIndex + 1];

    if (
      !nextStory ||
      nextStory.mediaType !== "image"
    ) {
      return;
    }

    const image = new Image();

    image.src = nextStory.mediaUrl;
  }, [
    group?.stories,
    storyIndex,
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
        <div
          style={{
            width:
              index < effectiveStoryIndex
                ? "100%"
                : index === effectiveStoryIndex
                  ? `${Math.round(progress * 100)}%`
                  : "0%",
          }}
          className="h-full rounded-full bg-white"
        />
      </div>
    ));
  }, [
    group,
    effectiveStoryIndex,
    progress,
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
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black text-white"
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
            style={{
              aspectRatio: "9 / 16",
              width: "min(100vw, calc(100dvh * 9 / 16))",
              height: "min(100dvh, calc(100vw * 16 / 9))",
            }}
            className="relative overflow-hidden bg-[#07111B]"
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
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17212B] text-sm font-bold"
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
                        currentStory.createdAt,
                        now
                      )}
                      {isOwnStory
                        ? ` - ${currentStory.viewCount ?? 0} ${
                            (currentStory.viewCount ?? 0) === 1
                              ? "view"
                              : "views"
                          }`
                        : ""}
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStory?.userId) {
                          onMuteUser(currentStory.userId);
                        }
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
                      aria-label="Mute story"
                    >
                      <BellOff size={17} />
                    </button>
                  )}

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

            {currentStory.mediaType === "text" ? (
              <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#17212B,#07111B)] p-7">
                <p className="whitespace-pre-wrap break-words text-center text-2xl font-semibold leading-snug text-white sm:text-3xl">
                  {currentStory.caption}
                </p>
              </div>
            ) : currentStory.mediaType === "video" ? (
              <video
                ref={videoRef}
                key={currentStory.id}
                src={currentStory.mediaUrl}
                autoPlay
                muted
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
                onLoadedData={() =>
                  setLoadedMediaStoryId(
                    currentStory.id
                  )
                }
                onCanPlay={() =>
                  setLoadedMediaStoryId(
                    currentStory.id
                  )
                }
                onEnded={() => {
                  videoEndedRef.current = true;
                  goNext();
                }}
                onError={goNext}
                className="h-full w-full bg-black object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={currentStory.id}
                src={currentStory.mediaUrl}
                alt=""
                loading="eager"
                onLoad={() =>
                  setLoadedMediaStoryId(
                    currentStory.id
                  )
                }
                onError={goNext}
                className="h-full w-full bg-black object-cover"
              />
            )}

            {mediaLoading && (
              <div className="absolute inset-0 z-[15] flex items-center justify-center bg-black/60">
                <Loader2
                  size={32}
                  className="text-white/70 motion-safe:animate-spin"
                />
              </div>
            )}

            {currentStory.caption && currentStory.mediaType !== "text" ? (
              <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-16">
                <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed backdrop-blur-xl">
                  {currentStory.caption}
                </p>
              </div>
            ) : null}

            {isOwnStory ? (
              <button
                type="button"
                onClick={() => setViewerListOpen(true)}
                className="absolute inset-x-5 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 rounded-2xl bg-black/45 px-4 py-3 text-left text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-black/60"
              >
                Seen by {storyViewersQuery.data?.length ?? currentStory.viewCount ?? 0}
              </button>
            ) : null}

            {!isOwnStory ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleStoryReply();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                className="absolute inset-x-0 bottom-0 z-30 flex items-end gap-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-16"
              >
                <textarea
                  value={replyText}
                  onChange={(event) =>
                    setReplyText(event.target.value.slice(0, 500))
                  }
                  onFocus={() => setReplyFocused(true)}
                  onBlur={() => setReplyFocused(false)}
                  rows={1}
                  placeholder="Reply..."
                  className="max-h-24 min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.10] px-4 py-3 text-sm leading-5 text-white outline-none backdrop-blur-xl placeholder:text-white/45 focus:border-[#2481CC]/55"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2481CC] text-white transition hover:bg-[#2F8ED8] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send story reply"
                >
                  {isSendingReply ? (
                    <Loader2 size={17} className="motion-safe:animate-spin" />
                  ) : (
                    <SendHorizonal size={17} />
                  )}
                </button>
              </form>
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
                    className="max-h-[60%] w-full overflow-hidden rounded-t-2xl border border-white/10 bg-[#0B111C]/95 shadow-lg shadow-black/30"
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
                        <div className="flex h-24 items-center justify-center text-[#7CC5FF]">
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
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17212B] text-sm font-bold"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {formatDisplayName(viewer.username)}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {formatStoryTime(viewer.viewedAt, now)} ago
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
                    className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B111C]/95 p-5 shadow-lg shadow-black/30"
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
                        className="flex h-12 items-center justify-center rounded-2xl bg-red-500 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-70"
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
