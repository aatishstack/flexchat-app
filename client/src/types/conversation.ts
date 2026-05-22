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
    lastSeenAt?: string | null;
  }[];

  unreadCount?: number;

  archivedAt?: string | null;

  localThemeId?: string | null;

  sharedThemeId?: string | null;

  themeUpdatedAt?: string | null;

  pinned?: boolean;

  folder?:
    | "all"
    | "work"
    | "friends"
    | "unread"
    | "groups";

  createdAt: string;
}
