import {
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
