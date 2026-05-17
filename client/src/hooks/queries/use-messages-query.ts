"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { getMessages } from "@/services/message.service";

const INITIAL_MESSAGE_LIMIT = 120;

export function useMessagesQuery(
  conversationId: string | null
) {
  return useQuery({
    enabled: !!conversationId,
    queryKey:
      conversationId
        ? queryKeys.messages.list(conversationId)
        : ["messages", "inactive"],
    queryFn: () =>
      getMessages(conversationId ?? "", {
        limit: INITIAL_MESSAGE_LIMIT,
      }),
    staleTime:
      8 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
