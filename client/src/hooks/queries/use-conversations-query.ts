"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";

import axios from "axios";

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
    // Keep previously loaded conversations visible across refetches so a
    // transient outage never blanks the list.
    placeholderData: keepPreviousData,
    // Retry transient/server failures several times with backoff before the
    // query is allowed to surface a hard error. Client errors (<500) are not
    // retried (they are not transient).
    retry: (failureCount, error) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status &&
        error.response.status < 500
      ) {
        return false;
      }

      return failureCount < 5;
    },
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 15_000),
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
