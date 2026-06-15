import { api } from "./api";

import type {
  Story,
  StoryViewer,
  StoryMediaType,
  StoryVisibility,
} from "@/types/story";

export async function getStories() {
  const response =
    await api.get<Story[]>("/stories");

  return response.data;
}

export async function createStory(input: {
  mediaUrl: string;
  mediaPublicId?: string;
  mediaType: StoryMediaType;
  visibility: StoryVisibility;
  caption?: string;
}) {
  const response =
    await api.post<Story>(
      "/stories",
      input
    );

  return response.data;
}

export async function getStoriesByUser(
  userId: string
) {
  const response =
    await api.get<Story[]>(
      `/stories/${encodeURIComponent(userId)}`
    );

  return response.data;
}

export async function markStoryViewed(
  storyId: string
) {
  await api.post(
    `/stories/${storyId}/view`
  );
}

export async function deleteStory(
  storyId: string
) {
  await api.delete(
    `/stories/${storyId}`
  );
}

export async function updateStoryVisibility(
  storyId: string,
  visibility: StoryVisibility,
) {
  const response = await api.patch<Story>(
    `/stories/${storyId}/privacy`,
    { visibility },
  );

  return response.data;
}

export async function getStoryViewers(
  storyId: string
) {
  const response =
    await api.get<StoryViewer[]>(
      `/stories/${storyId}/views`
    );

  return response.data;
}
