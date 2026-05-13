"use client";

import { useSocketStore } from "@/store/socket-store";

export const useSocket =
  () => {
    return useSocketStore();
  };