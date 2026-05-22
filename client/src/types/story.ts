export type StoryMediaType = "image" | "video";

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
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
