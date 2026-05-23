export type StoryMediaType = "image" | "video" | "text";

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
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
