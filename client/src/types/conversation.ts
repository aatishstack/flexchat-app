export interface Conversation {
  id: string;

  name: string | null;

  type: string;

  avatar?: string | null;

  latestMessage?: string;

  unreadCount?: number;

  folder?:
    | "all"
    | "work"
    | "friends"
    | "unread"
    | "groups";

  createdAt: string;
}