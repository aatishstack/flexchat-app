import type { Story, StoryGroup } from "@/types/story";

export const DEFAULT_STORY_DURATION_MS = 5_000;
export const VIDEO_STORY_FALLBACK_DURATION_MS = 12_000;

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function groupActiveStories(
  stories: Story[],
  currentUserId: string | undefined,
  now: number,
) {
  const groups = new Map<string, StoryGroup>();

  stories
    .filter((story) => toTimestamp(story.expiresAt) > now)
    .sort(
      (left, right) =>
        toTimestamp(left.createdAt) - toTimestamp(right.createdAt),
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

    const leftLatest =
      left.stories[left.stories.length - 1]?.createdAt ?? "";
    const rightLatest =
      right.stories[right.stories.length - 1]?.createdAt ?? "";

    return toTimestamp(rightLatest) - toTimestamp(leftLatest);
  });
}

export function getNextStoryExpiry(stories: Story[], now: number) {
  return stories
    .map((story) => toTimestamp(story.expiresAt))
    .filter((expiresAt) => expiresAt > now)
    .sort((left, right) => left - right)[0];
}

export function getInitialStoryIndex(
  group: StoryGroup,
  currentUserId: string | undefined,
) {
  if (group.userId === currentUserId) {
    return 0;
  }

  const unseenIndex = group.stories.findIndex((story) => !story.viewed);

  return unseenIndex >= 0 ? unseenIndex : 0;
}

export function getStoryDurationMs(
  story: Story,
  measuredVideoDurationMs?: number,
) {
  if (
    story.mediaType === "video" &&
    measuredVideoDurationMs &&
    measuredVideoDurationMs > 0
  ) {
    return Math.min(Math.max(measuredVideoDurationMs, 2_500), 30_000);
  }

  if ((story.durationSeconds ?? 0) > 0) {
    return (story.durationSeconds ?? 0) * 1_000;
  }

  return story.mediaType === "video"
    ? VIDEO_STORY_FALLBACK_DURATION_MS
    : DEFAULT_STORY_DURATION_MS;
}

export function formatStoryAge(value: string, now: number) {
  const diffMinutes = Math.max(
    1,
    Math.floor((now - toTimestamp(value)) / 60_000),
  );

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  return `${Math.floor(diffMinutes / 60)}h`;
}
