"use client";

import {
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";

import { queryKeys } from "@/lib/query-keys";
import { getConversationPage } from "@/services/conversation.service";
import type { Conversation } from "@/types/conversation";

const INITIAL_CONVERSATION_LIMIT = 200;

export function useConversationsQuery() {
  const query = useInfiniteQuery({
    initialPageParam:
      undefined as string | undefined,
    queryKey:
      queryKeys.conversations.all,
    queryFn: ({ pageParam }) =>
      getConversationPage({
        limit: INITIAL_CONVERSATION_LIMIT,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor,
    staleTime:
      20 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const queryData = query.data;

  const conversations = useMemo(() => {
    const data =
      queryData as
        | typeof queryData
        | Conversation[]
        | undefined;

    if (Array.isArray(data)) {
      return data;
    }

    return (
      data?.pages.flatMap(
        (page) => page.conversations
      ) ?? []
    );
  }, [queryData]);

  return {
    ...query,
    data: conversations,
  };
}
