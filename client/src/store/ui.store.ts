"use client";

import { create } from "zustand";

interface UIStore {
  darkMode: boolean;

  settingsOpen: boolean;

  search: string;

  toggleTheme: () => void;

  setSettingsOpen: (
    open: boolean
  ) => void;

  setSearch: (
    value: string
  ) => void;
}

export const useUIStore =
  create<UIStore>((set) => ({
    darkMode: true,

    settingsOpen: false,

    search: "",

    toggleTheme: () =>
      set((state) => ({
        darkMode:
          !state.darkMode,
      })),

    setSettingsOpen: (
      open
    ) =>
      set({
        settingsOpen: open,
      }),

    setSearch: (value) =>
      set({
        search: value,
      }),
  }));