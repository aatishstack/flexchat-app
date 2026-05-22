"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { getStories } from "@/services/story.service";

export function useStoriesQuery() {
  return useQuery({
    queryKey: queryKeys.stories.all,
    queryFn: getStories,
    staleTime: 15 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
