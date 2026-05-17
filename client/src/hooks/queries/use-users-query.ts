"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import {
  getDiscoverUsers,
  getUsersByIds,
} from "@/services/user.service";

export function useDiscoverUsersQuery(
  query: string
) {
  return useQuery({
    queryKey:
      queryKeys.users.discover(
        query.trim().toLowerCase()
      ),
    queryFn: () =>
      getDiscoverUsers(query),
    staleTime:
      20 * 1000,
  });
}

export function useUsersByIdsQuery(
  ids: string[]
) {
  const stableIds = useMemo(
    () =>
      Array.from(new Set(ids))
        .filter(Boolean)
        .sort(),
    [ids]
  );

  return useQuery({
    enabled:
      stableIds.length > 0,
    queryKey:
      queryKeys.users.lookup(stableIds),
    queryFn: () =>
      getUsersByIds(stableIds),
    staleTime:
      15 * 1000,
  });
}
