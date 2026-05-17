"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { getConversations } from "@/services/conversation.service";

const INITIAL_CONVERSATION_LIMIT = 200;

export function useConversationsQuery() {
  return useQuery({
    queryKey:
      queryKeys.conversations.all,
    queryFn: () =>
      getConversations({
        limit: INITIAL_CONVERSATION_LIMIT,
      }),
    staleTime:
      20 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
