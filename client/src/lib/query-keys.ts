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
} as const;
