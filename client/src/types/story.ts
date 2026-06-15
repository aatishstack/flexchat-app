export type StoryMediaType = "image" | "video" | "text";
export type StoryVisibility = "contacts" | "only_me";

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  visibility: StoryVisibility;
  durationSeconds?: number;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
  viewCount: number;
  user: {
    id: string;
    username: string;
    avatar?: string | null;
  };
}

export interface StoryViewer {
  id: string;
  username: string;
  avatar?: string | null;
  viewedAt: string;
}

export type StoryGroup = {
  userId: string;
  user: Story["user"];
  stories: Story[];
  hasUnseen: boolean;
};
