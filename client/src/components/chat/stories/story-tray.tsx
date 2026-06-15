"use client";

import { memo, useEffect, useMemo, useState } from "react";

import { AlertCircle, Loader2, Plus, RotateCcw } from "lucide-react";

import FlexAvatar from "@/components/chat/flex-avatar";
import { useStoriesQuery } from "@/hooks/queries/use-stories-query";
import { getServerNow } from "@/lib/server-time";
import { formatDisplayName } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import type { StoryGroup } from "@/types/story";

import { StoryCreator } from "./story-creator";
import {
  getNextStoryExpiry,
  groupActiveStories,
} from "./story-logic";
import StoryViewer from "./story-viewer";

type StoryAvatarProps = {
  group: StoryGroup | null;
  isCurrentUser?: boolean;
  isLoading?: boolean;
  avatar?: string | null;
  username?: string;
  onOpen: () => void;
};

const StoryAvatar = memo(function StoryAvatar({
  group,
  isCurrentUser = false,
  isLoading = false,
  avatar,
  username,
  onOpen,
}: StoryAvatarProps) {
  const name = isCurrentUser
    ? username
    : group?.user.username;

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1.5 text-center">
      <button
        type="button"
        onClick={onOpen}
        disabled={isLoading || (!isCurrentUser && !group)}
        className={cn(
          "fc-telegram-touch relative flex h-12 w-12 items-center justify-center rounded-full p-[1.5px] transition-transform duration-150 active:scale-[0.96] disabled:cursor-default disabled:opacity-60",
          group?.hasUnseen
            ? "bg-[#7C3AED]"
            : group
              ? "bg-white/15"
              : "bg-white/[0.08]",
        )}
        aria-label={
          isCurrentUser
            ? group
              ? "View your status"
              : "Create a status"
            : `View ${formatDisplayName(name ?? "")}'s status`
        }
      >
        <FlexAvatar
          src={isCurrentUser ? avatar : group?.user.avatar}
          name={name}
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#111111] text-sm font-semibold text-white ring-2 ring-black"
        />

        {isLoading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/65">
            <Loader2
              size={15}
              className="text-white/70 motion-safe:animate-spin"
            />
          </span>
        ) : null}
      </button>

      <span className="w-full truncate text-[11px] font-medium text-zinc-400">
        {isCurrentUser
          ? "Your status"
          : formatDisplayName(name ?? "")}
      </span>
    </div>
  );
});

function StoryTray() {
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(
    null,
  );
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [expiryCheckAt, setExpiryCheckAt] = useState(0);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const storiesQuery = useStoriesQuery();

  const storyGroups = useMemo(
    () =>
      groupActiveStories(
        storiesQuery.data ?? [],
        currentUserId,
        Math.max(expiryCheckAt, getServerNow()),
      ),
    [currentUserId, expiryCheckAt, storiesQuery.data],
  );

  const currentUserGroupIndex = storyGroups.findIndex(
    (group) => group.userId === currentUserId,
  );
  const currentUserGroup =
    currentUserGroupIndex >= 0
      ? storyGroups[currentUserGroupIndex]
      : null;
  const contactGroups = storyGroups.filter(
    (group) => group.userId !== currentUserId,
  );
  const viewerGroup =
    viewerGroupIndex === null
      ? null
      : (storyGroups[viewerGroupIndex] ?? null);

  useEffect(() => {
    const now = getServerNow();
    const nextExpiry = getNextStoryExpiry(storiesQuery.data ?? [], now);

    if (!nextExpiry) {
      return;
    }

    const timer = window.setTimeout(
      () => setExpiryCheckAt(getServerNow()),
      Math.min(nextExpiry - now + 50, 2_147_483_647),
    );

    return () => window.clearTimeout(timer);
  }, [expiryCheckAt, storiesQuery.data]);

  return (
    <section className="mt-3" aria-label="Status updates">
      <div className="flex min-h-[72px] items-start gap-2.5 overflow-x-auto pb-1 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative shrink-0">
          <StoryAvatar
            isCurrentUser
            group={currentUserGroup}
            avatar={currentUser?.avatar}
            username={currentUser?.username}
            isLoading={storiesQuery.isLoading && !storiesQuery.data}
            onOpen={() => {
              if (currentUserGroupIndex >= 0) {
                setViewerGroupIndex(currentUserGroupIndex);
                return;
              }

              setIsCreatorOpen(true);
            }}
          />

          <button
            type="button"
            onClick={() => setIsCreatorOpen(true)}
            className="fc-telegram-touch absolute right-0 top-8 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-[#7C3AED] text-white transition-colors duration-150 hover:bg-[#8B5CF6] active:bg-[#6D28D9]"
            aria-label="Create status"
          >
            <Plus size={11} strokeWidth={3} />
          </button>
        </div>

        {contactGroups.map((group) => {
          const groupIndex = storyGroups.findIndex(
            (candidate) => candidate.userId === group.userId,
          );

          return (
            <StoryAvatar
              key={group.userId}
              group={group}
              onOpen={() => setViewerGroupIndex(groupIndex)}
            />
          );
        })}

        {!storiesQuery.isLoading &&
        !storiesQuery.isError &&
        contactGroups.length === 0 ? (
          <div className="flex h-12 min-w-36 items-center rounded-xl border border-white/[0.06] bg-[#0A0A0A] px-3">
            <p className="text-xs leading-5 text-zinc-500">
              No recent updates
            </p>
          </div>
        ) : null}

        {storiesQuery.isError ? (
          <button
            type="button"
            onClick={() => void storiesQuery.refetch()}
            className="flex h-12 min-w-40 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0A0A0A] px-3 text-left text-xs text-zinc-400 transition-colors hover:bg-[#111111]"
          >
            <AlertCircle size={15} className="text-zinc-500" />
            <span className="flex-1">Updates unavailable</span>
            <RotateCcw size={14} />
          </button>
        ) : null}
      </div>

      <StoryCreator
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        currentUser={currentUser}
      />

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

export default memo(StoryTray);
