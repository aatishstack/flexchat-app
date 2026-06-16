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
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-2 text-center">
      <button
        type="button"
        onClick={onOpen}
        disabled={isLoading || (!isCurrentUser && !group)}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-150 active:scale-[0.96] disabled:cursor-default disabled:opacity-60",
          group?.hasUnseen
            ? "p-[2.5px] bg-[#7C4FF0]"
            : group
              ? "p-[2.5px] bg-white/10"
              : "p-[2px] bg-white/[0.05]",
        )}
        aria-label={
          isCurrentUser
            ? group
              ? "View your status"
              : "Create a status"
            : `View ${formatDisplayName(name ?? "")}'s status`
        }
      >
        <div className="h-full w-full rounded-full ring-2 ring-black overflow-hidden bg-[#111111]">
          <FlexAvatar
            src={isCurrentUser ? avatar : group?.user.avatar}
            name={name}
            className="h-full w-full text-[13px] font-bold"
          />
        </div>

        {isCurrentUser && !group && (
          <div className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full bg-[#7C4FF0] border-2 border-black flex items-center justify-center text-white">
            <Plus size={10} strokeWidth={4} />
          </div>
        )}

        {isLoading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/65">
            <Loader2
              size={15}
              className="text-white/70 motion-safe:animate-spin"
            />
          </span>
        ) : null}
      </button>

      <span className={cn(
        "w-full truncate text-[11px] font-medium transition-colors",
        group?.hasUnseen ? "text-white" : "text-white/40"
      )}>
        {isCurrentUser
          ? "My status"
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
    <section className="py-2" aria-label="Status updates">
      <div className="flex min-h-[82px] items-start gap-2.5 overflow-x-auto px-4 pb-1 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        {storiesQuery.isError ? (
          <button
            type="button"
            onClick={() => void storiesQuery.refetch()}
            className="flex h-14 min-w-40 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/5 px-4 text-left text-xs text-zinc-400 transition-colors hover:bg-white/10"
          >
            <AlertCircle size={15} className="text-zinc-500" />
            <span className="flex-1">Status failed</span>
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
