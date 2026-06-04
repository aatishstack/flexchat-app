"use client";

import {
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BellOff,
  Eye,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useStoriesQuery } from "@/hooks/queries/use-stories-query";
import FlexAvatar from "@/components/chat/flex-avatar";
import { formatDisplayName } from "@/lib/user-display";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";
import { getServerNow } from "@/lib/server-time";
import { cn } from "@/lib/utils";
import type { Story, StoryGroup } from "@/types/story";

import StoryViewer from "./story-viewer";
import { StoryCreator } from "./story-creator";

const MUTED_STORY_USERS_KEY = "flexchat:muted-story-users";

const StoryAvatar = memo(({ 
  group, 
  onClick, 
  isCurrentUser = false,
  isLoading = false 
}: { 
  group: StoryGroup | null;
  onClick: (rect: DOMRect) => void;
  isCurrentUser?: boolean;
  isLoading?: boolean;
}) => {
  const hasUnseen = group?.hasUnseen ?? false;
  
  return (
    <div className="relative flex w-[60px] shrink-0 flex-col items-center gap-1.5 text-center text-[10.5px] font-medium tracking-tight text-zinc-400">
      <button
        type="button"
        onClick={(e) => onClick(e.currentTarget.getBoundingClientRect())}
        disabled={isLoading || (!isCurrentUser && !group)}
        className="fc-telegram-touch relative flex h-[52px] w-[52px] items-center justify-center rounded-full p-[1.5px] transition-transform active:scale-[0.94] disabled:cursor-default disabled:opacity-70"
      >
        {/* Ring rendering: optimized with simple CSS gradients/colors */}
        <span
          className={cn(
            "absolute inset-0 rounded-full transition-colors duration-300",
            hasUnseen ? "fc-story-ring-unseen" : (group ? "bg-white/10" : "bg-white/5")
          )}
        />

        <FlexAvatar
          src={isCurrentUser ? undefined : group?.user.avatar}
          name={isCurrentUser ? undefined : group?.user.username}
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0E1621] text-sm font-bold text-white shadow-inner ring-2 ring-[#0E1621]"
        />

        {isLoading && (
          <span className="absolute inset-2 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <Loader2 size={15} className="text-white/70 motion-safe:animate-spin" />
          </span>
        )}
      </button>

      <span className="w-full truncate">
        {isCurrentUser ? "My Story" : group ? formatDisplayName(group.user.username) : ""}
      </span>
    </div>
  );
  });

StoryAvatar.displayName = "StoryAvatar";

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

function StoryTray() {
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [viewerSourceRect, setViewerSourceRect] = useState<DOMRect | null>(null);
  const [viewerGroupSource, setViewerGroupSource] =
    useState<"visible" | "muted">("visible");
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [mutedStoryUserIds, setMutedStoryUserIds] = useState<Set<string>>(
    readMutedStoryUserIds,
  );
  const [mutedStoriesOpen, setMutedStoriesOpen] = useState(false);
  const [expiryCheckAt, setExpiryCheckAt] =
    useState(0);
  const reducedMotion = useReducedMotion();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const pushToast = useToastStore((state) => state.pushToast);
  const storiesQuery = useStoriesQuery();

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

  function muteStoryUser(userId: string) {
    setMutedStoryUserIds((current) => {
      const next = new Set(current);
      next.add(userId);
      try {
        window.localStorage.setItem(
          MUTED_STORY_USERS_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {}
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
      } catch {}
      return next;
    });

    pushToast({
      title: "Story unmuted",
      message: "Stories from this person are back in your tray.",
      variant: "success",
    });
  }

  const viewerGroups =
    viewerGroupSource === "muted"
      ? mutedStoryGroups
      : storyGroups;
  const viewerGroup =
    viewerGroupIndex === null ? null : (viewerGroups[viewerGroupIndex] ?? null);
  const myStoryLoading =
    storiesQuery.isLoading && !storiesQuery.data;

  return (
    <section className="mt-2.5">
      {/* Story Rail: Isolated scroll container with GPU-friendly CSS */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative flex shrink-0">
          <StoryAvatar 
            isCurrentUser 
            group={currentUserStoryGroup} 
            isLoading={myStoryLoading}
            onClick={(rect) => {
              if (myStoryLoading || currentUserStoryGroupIndex < 0) return;
              setViewerSourceRect(rect);
              setViewerGroupSource("visible");
              setViewerGroupIndex(currentUserStoryGroupIndex);
            }} 
          />
          
          <button
            type="button"
            onClick={() => setIsCreatorOpen(true)}
            className="fc-telegram-touch absolute right-0.5 top-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2px] border-[#0E1621] bg-[#2AABEE] text-white shadow-sm transition hover:bg-[#3BB7F3] active:scale-90"
            aria-label="Create story"
          >
            <Plus size={12} strokeWidth={3} />
          </button>
        </div>

        {visibleStoryGroups.map((group) => {
          const originalIndex = storyGroups.findIndex((sg) => sg.userId === group.userId);
          return (
            <StoryAvatar 
              key={group.userId} 
              group={group} 
              onClick={(rect) => {
                setViewerSourceRect(rect);
                setViewerGroupSource("visible");
                setViewerGroupIndex(originalIndex);
              }} 
            />
          );
        })}
      </div>

      {mutedStoryGroups.length ? (
        <div className="mt-2 rounded-2xl bg-white/[0.035] p-2">
          <button
            type="button"
            onClick={() => setMutedStoriesOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2AABEE]/12 text-[#75CFF6]"><BellOff size={15} /></span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-zinc-200">Muted stories</span>
                <span className="block truncate text-[11px] text-zinc-500">{mutedStoryGroups.length} hidden</span>
              </span>
            </span>
            <span className="text-[11px] font-medium text-[#75CFF6]">{mutedStoriesOpen ? "Hide" : "Show"}</span>
          </button>

          <AnimatePresence>
            {mutedStoriesOpen ? (
              <motion.div initial={reducedMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reducedMotion ? undefined : { opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                  {mutedStoryGroups.map((group, index) => (
                    <div key={group.userId} className="flex w-[78px] shrink-0 flex-col items-center gap-2 rounded-2xl px-2 py-2 text-center transition hover:bg-white/[0.04]">
                      <button
                        type="button"
                        onClick={(e) => {
                          setViewerSourceRect(e.currentTarget.getBoundingClientRect());
                          setViewerGroupSource("muted");
                          setViewerGroupIndex(index);
                        }}
                        className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white/10 p-[2px]"
                      >
                        <FlexAvatar src={group.user.avatar} name={group.user.username} className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#0E1621] text-sm font-bold text-white ring-2 ring-[#0D1823]" />
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#0D1823] bg-[#0E1621] text-[#75CFF6]"><Eye size={11} /></span>
                      </button>
                      <span className="w-full truncate text-[11px] text-zinc-400">{formatDisplayName(group.user.username)}</span>
                      <button type="button" onClick={() => unmuteStoryUser(group.userId)} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:bg-[#2AABEE]/20 hover:text-[#A7D8FF]"><RotateCcw size={13} /></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <StoryCreator isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} currentUser={currentUser} />

      <StoryViewer
        group={viewerGroup}
        groups={viewerGroups}
        groupIndex={viewerGroupIndex}
        sourceRect={viewerSourceRect}
        onGroupIndexChange={setViewerGroupIndex}
        onMuteUser={muteStoryUser}
        onClose={() => {
          setViewerGroupIndex(null);
          setViewerSourceRect(null);
        }}
      />
    </section>
  );
}

export default memo(StoryTray);
