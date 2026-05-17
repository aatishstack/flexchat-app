import type { InfiniteData } from "@tanstack/react-query";

import type { Conversation } from "@/types/conversation";

export type ConversationPageCache = {
  conversations: Conversation[];
  nextCursor?: string;
};

export type ConversationQueryCache =
  | Conversation[]
  | InfiniteData<
      ConversationPageCache,
      string | undefined
    >
  | undefined;

function isInfiniteConversationCache(
  cache: ConversationQueryCache
): cache is InfiniteData<
  ConversationPageCache,
  string | undefined
> {
  return (
    !!cache &&
    typeof cache === "object" &&
    "pages" in cache &&
    Array.isArray(cache.pages)
  );
}

export function updateConversationInQueryCache(
  cache: ConversationQueryCache,
  conversationId: string,
  updater: (
    conversation: Conversation
  ) => Conversation
): ConversationQueryCache {
  if (!cache) {
    return cache;
  }

  if (!isInfiniteConversationCache(cache)) {
    return cache.map((conversation) =>
      conversation.id === conversationId
        ? updater(conversation)
        : conversation
    );
  }

  let changed = false;
  const pages = cache.pages.map((page) => {
    let pageChanged = false;
    const conversations =
      page.conversations.map(
        (conversation) => {
          if (
            conversation.id !== conversationId
          ) {
            return conversation;
          }

          changed = true;
          pageChanged = true;

          return updater(conversation);
        }
      );

    return pageChanged
      ? {
          ...page,
          conversations,
        }
      : page;
  });

  return changed
    ? {
        ...cache,
        pages,
      }
      : cache;
}

export function upsertConversationInQueryCache(
  cache: ConversationQueryCache,
  conversation: Conversation
): ConversationQueryCache {
  if (!cache) {
    return {
      pages: [
        {
          conversations: [
            conversation,
          ],
          nextCursor:
            undefined,
        },
      ],
      pageParams: [
        undefined,
      ],
    };
  }

  if (!isInfiniteConversationCache(cache)) {
    const existingIndex =
      cache.findIndex(
        (item) =>
          item.id === conversation.id
      );

    if (existingIndex === -1) {
      return [
        conversation,
        ...cache,
      ];
    }

    return cache.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            ...conversation,
          }
        : item
    );
  }

  let found = false;
  const pages = cache.pages.map((page) => {
    const existingIndex =
      page.conversations.findIndex(
        (item) =>
          item.id === conversation.id
      );

    if (existingIndex === -1) {
      return page;
    }

    found = true;

    return {
      ...page,
      conversations:
        page.conversations.map(
          (item, index) =>
            index === existingIndex
              ? {
                  ...item,
                  ...conversation,
                }
              : item
        ),
    };
  });

  if (!found) {
    const [
      firstPage,
      ...restPages
    ] = pages;

    return {
      ...cache,
      pages: [
        {
          ...(firstPage ?? {
            nextCursor:
              undefined,
          }),
          conversations: [
            conversation,
            ...(firstPage?.conversations ?? []),
          ],
        },
        ...restPages,
      ],
    };
  }

  return {
    ...cache,
    pages,
  };
}
