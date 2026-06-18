"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import {
  type DiscoverUsersScope,
  getDiscoverUsers,
  getUsersByIds,
} from "@/services/user.service";

export function useDiscoverUsersQuery(
  query: string,
  options: {
    enabled?: boolean;
    scope?: DiscoverUsersScope;
  } = {}
) {
  const scope =
    options.scope ?? "discover";

  return useQuery({
    enabled:
      options.enabled ?? true,
    queryKey:
      queryKeys.users.discover(
        query.trim().toLowerCase(),
        scope
      ),
    queryFn: () =>
      getDiscoverUsers(query, {
        scope,
      }),
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
