import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

import axios from "axios";

function shouldRetryQuery(
  failureCount: number,
  error: unknown
) {
  if (failureCount >= 2) {
    return false;
  }

  if (
    axios.isAxiosError(error) &&
    error.response?.status &&
    error.response.status < 500
  ) {
    return false;
  }

  return true;
}

export const queryClient =
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        console.error("[FlexChat Query] request failed", {
          queryKey: query.queryKey,
          message:
            error instanceof Error
              ? error.message
              : "Unknown query failure",
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        console.error("[FlexChat Mutation] request failed", {
          mutationKey: mutation.options.mutationKey,
          message:
            error instanceof Error
              ? error.message
              : "Unknown mutation failure",
        });
      },
    }),
    defaultOptions: {
      queries: {
        gcTime: 5 * 60 * 1000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        staleTime: 15 * 1000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
