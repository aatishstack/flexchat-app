"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { getConversations } from "@/services/conversation.service";

export function useConversationsQuery() {
  return useQuery({
    queryKey:
      queryKeys.conversations.all,
    queryFn:
      getConversations,
    staleTime:
      20 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
