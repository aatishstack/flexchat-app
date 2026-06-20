"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";

import axios from "axios";

import { queryKeys } from "@/lib/query-keys";
import { getMessagePage } from "@/services/message.service";
import type { Message } from "@/services/message.service";

const INITIAL_MESSAGE_LIMIT = 120;

export function useMessagesQuery(
  conversationId: string | null
) {
  const query = useInfiniteQuery({
    enabled: !!conversationId,
    initialPageParam:
      undefined as string | undefined,
    queryKey:
      conversationId
        ? queryKeys.messages.list(conversationId)
        : ["messages", "inactive"],
    queryFn: ({ pageParam }) =>
      getMessagePage(conversationId ?? "", {
        limit: INITIAL_MESSAGE_LIMIT,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor,
    staleTime:
      8 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    gcTime: 5 * 60 * 1000,
    // Keep the existing thread on screen across refetches so a transient
    // outage never blanks the conversation.
    placeholderData: keepPreviousData,
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

  const messages = useMemo(
    () => {
      const data =
        queryData as
          | typeof queryData
          | Message[]
          | undefined;

      if (Array.isArray(data)) {
        return data;
      }

      return data
        ? [...data.pages]
            .reverse()
            .flatMap((page) => page.messages)
        : [];
    },
    [queryData]
  );

  return {
    ...query,
    data: messages,
  };
}
