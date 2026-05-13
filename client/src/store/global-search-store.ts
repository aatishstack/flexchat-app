"use client";

import { create } from "zustand";

interface GlobalSearchState {
  open: boolean;

  query: string;

  setOpen: (
    open: boolean
  ) => void;

  setQuery: (
    query: string
  ) => void;
}

export const useGlobalSearchStore =
  create<GlobalSearchState>(
    (set) => ({
      open: false,

      query: "",

      setOpen: (
        open
      ) =>
        set({
          open,
        }),

      setQuery: (
        query
      ) =>
        set({
          query,
        }),
    })
  );