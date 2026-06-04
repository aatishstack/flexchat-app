export type ConversationFolder =
  | "work"
  | "friends"
  | "groups";

export interface Conversation {
  id: string;

  name: string | null;

  type: string;

  avatar?: string | null;

  latestMessage?: string;

  lastActivityAt?: string;

  memberIds?: string[];

  members?: {
    id: string;
    username: string;
    avatar?: string | null;
    lastSeenAt?: string | number | null;
  }[];

  unreadCount?: number;

  archivedAt?: string | null;

  localThemeId?: string | null;

  sharedThemeId?: string | null;

  themeUpdatedAt?: string | null;

  pinned?: boolean;

  pinnedAt?: string | null;

  muted?: boolean;

  mutedAt?: string | null;

  folder?: ConversationFolder | null;

  createdAt: string;
}
