import { api } from "./api";

import type {
  Story,
  StoryViewer,
  StoryMediaType,
} from "@/types/story";

export async function getStories() {
  const response =
    await api.get<Story[]>("/stories");

  return response.data;
}

export async function createStory(input: {
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption?: string;
}) {
  const response =
    await api.post<Story>(
      "/stories",
      input
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

export async function getStoryViewers(
  storyId: string
) {
  const response =
    await api.get<StoryViewer[]>(
      `/stories/${storyId}/views`
    );

  return response.data;
}
