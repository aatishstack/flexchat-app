"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { getStories } from "@/services/story.service";
import { useAuthStore } from "@/stores/auth.store";

export function useStoriesQuery() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  return useQuery({
    enabled: isAuthenticated,
    queryKey: queryKeys.stories.all,
    queryFn: getStories,
    staleTime: 15 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}
