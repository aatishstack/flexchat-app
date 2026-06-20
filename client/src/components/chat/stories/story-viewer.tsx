"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  MoreVertical,
  ShieldCheck,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import FlexAvatar from "@/components/chat/flex-avatar";
import { useServerNow } from "@/hooks/use-server-now";
import { queryKeys } from "@/lib/query-keys";
import { formatDisplayName } from "@/lib/user-display";
import {
  deleteStory,
  markStoryViewed,
  updateStoryVisibility,
} from "@/services/story.service";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";
import type {
  Story,
  StoryGroup,
  StoryVisibility,
} from "@/types/story";

import {
  formatStoryAge,
  getStoryDurationMs,
} from "./story-logic";

type Props = {
  group: StoryGroup | null;
  groups: StoryGroup[];
  groupIndex: number | null;
  onGroupIndexChange: (index: number | null) => void;
  onClose: () => void;
};

type StoryMediaProps = {
  story: Story;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  muted: boolean;
  onLoaded: (storyId: string) => void;
  onError: () => void;
  onVideoMetadata: (durationMs: number) => void;
  onVideoEnded: () => void;
};

const StoryMedia = memo(function StoryMedia({
  story,
  videoRef,
  muted,
  onLoaded,
  onError,
  onVideoMetadata,
  onVideoEnded,
}: StoryMediaProps) {
  if (story.mediaType === "text") {
    return (
      <div 
        className="flex h-full w-full items-center justify-center px-8" 
        style={{ background: "#7C4FF0" }}
      >
        <h2 className="text-white text-3xl font-bold px-8 text-center leading-snug drop-shadow-lg">
          {story.caption}
        </h2>
      </div>
    );
  }

  if (story.mediaType === "video") {
    return (
      <video
        ref={videoRef}
        key={story.id}
        src={story.mediaUrl}
        autoPlay
        muted={muted}
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration;

          if (Number.isFinite(duration) && duration > 0) {
            onVideoMetadata(duration * 1_000);
          }
        }}
        onLoadedData={() => onLoaded(story.id)}
        onCanPlay={() => onLoaded(story.id)}
        onEnded={onVideoEnded}
        onError={onError}
        className="h-full w-full bg-black object-cover"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={story.id}
      src={story.mediaUrl}
      alt=""
      loading="eager"
      decoding="async"
      onLoad={() => onLoaded(story.id)}
      onError={onError}
      className="h-full w-full bg-black object-cover"
    />
  );
});

function visibilityLabel(visibility: StoryVisibility) {
  return visibility === "contacts" ? "My contacts" : "Only me";
}

export default function StoryViewer({
  group,
  groups,
  groupIndex,
  onGroupIndexChange,
  onClose,
}: Props) {
  const [storyIndex, setStoryIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [loadedMediaStoryId, setLoadedMediaStoryId] = useState<string>();
  const [documentVisible, setDocumentVisible] = useState(true);
  // Video stories play with sound by default (the viewer only opens via a tap,
  // which satisfies autoplay gesture requirements). Users can mute/unmute, and
  // if a browser blocks unmuted autoplay we fall back to muted playback.
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState({
    storyId: "",
    durationMs: 0,
  });
  const progressRef = useRef(0);
  const progressBarRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const markedStoryIdsRef = useRef(new Set<string>());
  const advancingStoryIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const now = useServerNow();

  const effectiveStoryIndex = group
    ? Math.min(storyIndex, Math.max(group.stories.length - 1, 0))
    : 0;
  const currentStory =
    group?.stories[effectiveStoryIndex] ?? null;
  const currentStoryId = currentStory?.id;
  const isOwnStory = currentStory?.userId === currentUserId;
  const mediaLoading =
    !!currentStory &&
    currentStory.mediaType !== "text" &&
    loadedMediaStoryId !== currentStory.id;
  const timerPaused =
    isHolding ||
    deleteConfirmOpen ||
    privacyOpen ||
    mediaLoading ||
    !documentVisible;
  const duration = currentStory
    ? getStoryDurationMs(
        currentStory,
        videoDuration.storyId === currentStory.id
          ? videoDuration.durationMs
          : undefined,
      )
    : 0;

  const closeViewer = useCallback(() => {
    setStoryIndex(0);
    setPrivacyOpen(false);
    setDeleteConfirmOpen(false);
    onClose();
  }, [onClose]);

  const { mutate: markViewed } = useMutation({
    mutationFn: markStoryViewed,
    onSuccess: (_, storyId) => {
      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) =>
          (stories ?? []).map((story) =>
            story.id === storyId
              ? { ...story, viewed: true }
              : story,
          ),
      );
    },
    onError: (_error, storyId) => {
      markedStoryIdsRef.current.delete(storyId);
    },
  });

  const deleteMutation = useMutation({
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
          (stories ?? []).filter((story) => story.id !== storyId),
      );

      return { previousStories };
    },
    onSuccess: () => {
      setDeleteConfirmOpen(false);
      closeViewer();
      pushToast({
        title: "Status deleted",
        variant: "success",
      });
    },
    onError: (_error, _storyId, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(
          queryKeys.stories.all,
          context.previousStories,
        );
      }

      pushToast({
        title: "Could not delete status",
        message: "Please try again.",
        variant: "error",
      });
    },
  });

  const privacyMutation = useMutation({
    mutationFn: ({
      storyId,
      visibility,
    }: {
      storyId: string;
      visibility: StoryVisibility;
    }) => updateStoryVisibility(storyId, visibility),
    onSuccess: (updatedStory) => {
      queryClient.setQueryData<Story[]>(
        queryKeys.stories.all,
        (stories) =>
          (stories ?? []).map((story) =>
            story.id === updatedStory.id ? updatedStory : story,
          ),
      );
      setPrivacyOpen(false);
      pushToast({
        title: "Status privacy updated",
        message: `Visible to ${visibilityLabel(updatedStory.visibility).toLowerCase()}.`,
        variant: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Could not update privacy",
        message: "Please try again.",
        variant: "error",
      });
    },
  });

  const goNext = useCallback(() => {
    if (!group || groupIndex === null) {
      return;
    }

    if (effectiveStoryIndex < group.stories.length - 1) {
      setStoryIndex(effectiveStoryIndex + 1);
      return;
    }

    if (groupIndex < groups.length - 1) {
      setStoryIndex(0);
      onGroupIndexChange(groupIndex + 1);
      return;
    }

    closeViewer();
  }, [
    closeViewer,
    effectiveStoryIndex,
    group,
    groupIndex,
    groups.length,
    onGroupIndexChange,
  ]);

  const goPrevious = useCallback(() => {
    if (!group || groupIndex === null) {
      return;
    }

    if (effectiveStoryIndex > 0) {
      setStoryIndex(effectiveStoryIndex - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];

      onGroupIndexChange(groupIndex - 1);
      setStoryIndex(Math.max(previousGroup.stories.length - 1, 0));
    }
  }, [
    effectiveStoryIndex,
    group,
    groupIndex,
    groups,
    onGroupIndexChange,
  ]);

  const advanceOnce = useCallback(() => {
    if (
      !currentStoryId ||
      advancingStoryIdRef.current === currentStoryId
    ) {
      return;
    }

    advancingStoryIdRef.current = currentStoryId;
    goNext();
  }, [currentStoryId, goNext]);

  useEffect(() => {
    if (
      !currentStory ||
      currentStory.viewed ||
      currentStory.userId === currentUserId ||
      markedStoryIdsRef.current.has(currentStory.id)
    ) {
      return;
    }

    markedStoryIdsRef.current.add(currentStory.id);
    markViewed(currentStory.id);
  }, [currentStory, currentUserId, markViewed]);

  useEffect(() => {
    if (!currentStoryId) {
      return;
    }

    progressRef.current = 0;
    advancingStoryIdRef.current = null;
    progressBarRefs.current.forEach((bar, index) => {
      if (bar) {
        bar.style.transform =
          index < effectiveStoryIndex ? "scaleX(1)" : "scaleX(0)";
      }
    });
  }, [currentStoryId, effectiveStoryIndex]);

  useEffect(() => {
    if (!currentStory || timerPaused || duration <= 0) {
      return;
    }

    let frameId = 0;
    let previousTime = performance.now();

    function tick(frameTime: number) {
      const elapsed = frameTime - previousTime;
      previousTime = frameTime;
      progressRef.current = Math.min(
        1,
        progressRef.current + elapsed / duration,
      );

      const activeBar = progressBarRefs.current[effectiveStoryIndex];

      if (activeBar) {
        activeBar.style.transform = `scaleX(${progressRef.current})`;
      }

      if (progressRef.current >= 1) {
        advanceOnce();
        return;
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [
    currentStory,
    advanceOnce,
    duration,
    effectiveStoryIndex,
    timerPaused,
  ]);

  useEffect(() => {
    if (!videoRef.current || currentStory?.mediaType !== "video") {
      return;
    }

    const video = videoRef.current;

    if (timerPaused) {
      video.pause();
      return;
    }

    video.muted = isVideoMuted;
    void video.play().catch(() => {
      // Some browsers block unmuted autoplay; fall back to muted playback so
      // the story still plays, and reflect the muted state in the UI.
      video.muted = true;
      setIsVideoMuted(true);
      void video.play().catch(() => undefined);
    });
  }, [currentStory, timerPaused, isVideoMuted]);

  useEffect(() => {
    const nextStory = group?.stories[effectiveStoryIndex + 1];

    if (!nextStory || nextStory.mediaType !== "image") {
      return;
    }

    const image = new Image();
    image.src = nextStory.mediaUrl;
  }, [effectiveStoryIndex, group?.stories]);

  useEffect(() => {
    function handleVisibilityChange() {
      setDocumentVisible(document.visibilityState === "visible");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeViewer();
      } else if (event.key === "ArrowLeft") {
        goPrevious();
      } else if (event.key === "ArrowRight") {
        advanceOnce();
      }
    }

    if (!group) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [advanceOnce, closeViewer, goPrevious, group]);

  const progressBars = useMemo(
    () =>
      group?.stories.map((story, index) => (
        <div
          key={story.id}
          className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
        >
          <div
            ref={(element) => {
              progressBarRefs.current[index] = element;
            }}
            style={{
              transform:
                index < effectiveStoryIndex ? "scaleX(1)" : "scaleX(0)",
              transformOrigin: "left",
            }}
            className="h-full w-full rounded-full bg-white"
          />
        </div>
      )) ?? null,
    [effectiveStoryIndex, group?.stories],
  );

  if (
    typeof document === "undefined" ||
    !group ||
    !currentStory
  ) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[260] flex flex-col h-full bg-black text-white">
      {/* Background Media */}
      <div 
        className="absolute inset-0"
        onPointerDown={() => setIsHolding(true)}
        onPointerUp={() => setIsHolding(false)}
        onPointerCancel={() => setIsHolding(false)}
        onPointerLeave={() => setIsHolding(false)}
      >
        <StoryMedia
          story={currentStory}
          videoRef={videoRef}
          muted={isVideoMuted}
          onLoaded={setLoadedMediaStoryId}
          onError={advanceOnce}
          onVideoEnded={advanceOnce}
          onVideoMetadata={(durationMs) =>
            setVideoDuration({
              storyId: currentStory.id,
              durationMs,
            })
          }
        />
        
        {/* Overlay gradient top & bottom */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
          <div className="h-32 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="h-40 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        {/* Progress Bar */}
        <div className="pt-[14px] px-2 flex gap-1 pointer-events-auto">
          {progressBars}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <FlexAvatar
              src={group.user.avatar}
              name={group.user.username}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#161616] text-[12px] font-bold"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[13.5px] font-bold text-white shadow-black drop-shadow-md truncate">
                {isOwnStory ? "Your status" : formatDisplayName(group.user.username)}
              </span>
              <span className="text-[11px] text-white/80 font-medium shadow-black drop-shadow-md">
                {formatStoryAge(currentStory.createdAt, now)}
                {isOwnStory ? ` · ${visibilityLabel(currentStory.visibility)}` : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {currentStory.mediaType === "video" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVideoMuted((value) => !value);
                }}
                className="p-2"
                aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
              >
                {isVideoMuted ? (
                  <VolumeX size={20} className="text-white drop-shadow-md" />
                ) : (
                  <Volume2 size={20} className="text-white drop-shadow-md" />
                )}
              </button>
            )}
            {isOwnStory && (
              <button 
                onClick={(e) => { e.stopPropagation(); setPrivacyOpen(!privacyOpen); }}
                className="p-2"
              >
                <MoreVertical size={20} className="text-white drop-shadow-md" />
              </button>
            )}
            <button onClick={closeViewer} className="p-2">
              <X size={24} className="text-white drop-shadow-md" />
            </button>
          </div>
        </div>

        {/* Interactive Areas */}
        <div className="flex-1 flex pointer-events-auto">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrevious(); }}
            className="flex-1"
            aria-label="Previous status"
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); advanceOnce(); }}
            className="flex-1"
            aria-label="Next status"
          />
        </div>

        {/* Footer reply/react controls intentionally omitted until wired to a
            real backend action — no dead/non-functional controls are shown. */}

        {/* Privacy Popover */}
        {privacyOpen && isOwnStory && (
          <div
            className="absolute right-4 top-16 w-56 rounded-xl border border-white/[0.08] bg-[#111111] p-1.5 shadow-2xl pointer-events-auto"
          >
            {(["contacts", "only_me"] as const).map((visibility) => {
              const selected = currentStory.visibility === visibility;
              const Icon = visibility === "contacts" ? Users : Lock;

              return (
                <button
                  key={visibility}
                  type="button"
                  onClick={() =>
                    privacyMutation.mutate({
                      storyId: currentStory.id,
                      visibility,
                    })
                  }
                  disabled={selected || privacyMutation.isPending}
                  className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${
                    selected
                      ? "bg-[#7C4FF0]/15 text-[#C4B5FD]"
                      : "text-zinc-300 hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon size={15} />
                  <span className="flex-1">{visibilityLabel(visibility)}</span>
                  {privacyMutation.isPending && !selected && (
                    <Loader2 size={14} className="motion-safe:animate-spin" />
                  )}
                </button>
              );
            })}
            <div className="h-px bg-white/5 my-1" />
            <button
              onClick={() => { setDeleteConfirmOpen(true); setPrivacyOpen(false); }}
              className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={15} />
              <span>Delete status</span>
            </button>
          </div>
        )}

        {/* Delete Confirmation Overlay */}
        {deleteConfirmOpen && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-5 pointer-events-auto"
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111111] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
                  <AlertTriangle size={19} />
                </span>
                <div>
                  <h3 className="font-semibold">Delete status?</h3>
                  <p className="mt-1 text-sm leading-5 text-zinc-500">
                    This update will be removed immediately.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="h-11 rounded-xl border border-white/[0.08] bg-[#161616] text-sm text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(currentStory.id)}
                  disabled={deleteMutation.isPending}
                  className="flex h-11 items-center justify-center rounded-xl bg-red-500 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 size={17} className="motion-safe:animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading Indicator Overlay */}
      {mediaLoading && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/20">
          <Loader2 size={24} className="text-white/65 motion-safe:animate-spin" />
        </div>
      )}
    </div>,
    document.body,
  );
}
