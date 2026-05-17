import type { InfiniteData } from "@tanstack/react-query";

import type {
  Message,
  MessageStatus,
} from "@/store/socket-store";

export type MessagePageCache = {
  messages: Message[];
  nextCursor?: string;
};

export type MessageQueryCache =
  | Message[]
  | InfiniteData<
      MessagePageCache,
      string | undefined
    >
  | undefined;

type MessageReceipt = {
  messageId: string;
  serverId?: string;
  status?: MessageStatus;
};

function isInfiniteMessageCache(
  cache: MessageQueryCache
): cache is InfiniteData<
  MessagePageCache,
  string | undefined
> {
  return (
    !!cache &&
    typeof cache === "object" &&
    "pages" in cache &&
    Array.isArray(cache.pages)
  );
}

function messageMatches(
  message: Message,
  incoming: Pick<Message, "id" | "tempId">
) {
  return (
    message.id === incoming.id ||
    (!!message.tempId &&
      message.tempId === incoming.id) ||
    (!!incoming.tempId &&
      (message.id === incoming.tempId ||
        message.tempId === incoming.tempId))
  );
}

export function sortMessageList(messages: Message[]) {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt
      ? new Date(left.createdAt).getTime()
      : 0;
    const rightTime = right.createdAt
      ? new Date(right.createdAt).getTime()
      : 0;

    return leftTime - rightTime;
  });
}

export function mergeMessageList(
  messages: Message[] | undefined,
  incoming: Message
) {
  const currentMessages = messages ?? [];
  const existingIndex =
    currentMessages.findIndex((message) =>
      messageMatches(message, incoming)
    );

  if (existingIndex === -1) {
    return sortMessageList([
      ...currentMessages,
      incoming,
    ]);
  }

  return sortMessageList(
    currentMessages.map((message, index) =>
      index === existingIndex
        ? {
            ...message,
            ...incoming,
            optimistic: false,
          }
        : message
    )
  );
}

export function updateMessageStatusInList(
  messages: Message[] | undefined,
  receipt: MessageReceipt,
  fallbackStatus: MessageStatus
) {
  if (!messages) {
    return messages;
  }

  let changed = false;
  const nextMessages = messages.map((message) => {
    const matches =
      message.id === receipt.messageId ||
      message.id === receipt.serverId ||
      message.tempId === receipt.messageId;

    if (!matches) {
      return message;
    }

    changed = true;

    return {
      ...message,
      id:
        receipt.serverId ??
        message.id,
      status:
        receipt.status ??
        fallbackStatus,
      optimistic: false,
    };
  });

  return changed
    ? sortMessageList(nextMessages)
    : messages;
}

export function mergeMessageIntoQueryCache(
  cache: MessageQueryCache,
  incoming: Message
): MessageQueryCache {
  if (!cache) {
    return cache;
  }

  if (!isInfiniteMessageCache(cache)) {
    return mergeMessageList(cache, incoming);
  }

  let found = false;
  const pages = cache.pages.map((page) => {
    const pageHasMessage =
      page.messages.some((message) =>
        messageMatches(message, incoming)
      );

    if (!pageHasMessage) {
      return page;
    }

    found = true;

    return {
      ...page,
      messages: mergeMessageList(
        page.messages,
        incoming
      ),
    };
  });

  if (!found && pages[0]) {
    pages[0] = {
      ...pages[0],
      messages: mergeMessageList(
        pages[0].messages,
        incoming
      ),
    };
  }

  return {
    ...cache,
    pages,
  };
}

export function updateMessageStatusInQueryCache(
  cache: MessageQueryCache,
  receipt: MessageReceipt,
  fallbackStatus: MessageStatus
): MessageQueryCache {
  if (!cache) {
    return cache;
  }

  if (!isInfiniteMessageCache(cache)) {
    return updateMessageStatusInList(
      cache,
      receipt,
      fallbackStatus
    );
  }

  let changed = false;
  const pages = cache.pages.map((page) => {
    const nextMessages =
      updateMessageStatusInList(
        page.messages,
        receipt,
        fallbackStatus
      );

    if (nextMessages === page.messages) {
      return page;
    }

    changed = true;

    return {
      ...page,
      messages:
        nextMessages ?? page.messages,
    };
  });

  return changed
    ? {
        ...cache,
        pages,
      }
    : cache;
}
