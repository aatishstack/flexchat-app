export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  conversations: {
    all: ["conversations"] as const,
    detail: (conversationId: string) =>
      [
        "conversations",
        conversationId,
      ] as const,
  },
  messages: {
    list: (conversationId: string) =>
      [
        "messages",
        conversationId,
      ] as const,
  },
  stories: {
    all: ["stories"] as const,
  },
  users: {
    discover: (query: string) =>
      [
        "users",
        "discover",
        query,
      ] as const,
    lookup: (ids: string[]) =>
      [
        "users",
        "lookup",
        ...ids,
      ] as const,
  },
} as const;
