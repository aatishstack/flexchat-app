"use client";

import { create } from "zustand";

import {
  DEFAULT_CHAT_THEME_ID,
  applyGlobalChatTheme,
  getChatTheme,
  getStoredChatThemeId,
  type ChatTheme,
} from "@/lib/chat-themes";

type ThemeState = {
  themeId: string;
  theme: ChatTheme;
  hydrated: boolean;
  hydrate: () => void;
  setTheme: (themeId?: string | null) => void;
  syncTheme: (themeId?: string | null) => void;
};

function resolveTheme(themeId?: string | null) {
  return getChatTheme(themeId ?? DEFAULT_CHAT_THEME_ID);
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: DEFAULT_CHAT_THEME_ID,
  theme: resolveTheme(DEFAULT_CHAT_THEME_ID),
  hydrated: false,
  hydrate: () => {
    const theme = applyGlobalChatTheme(getStoredChatThemeId());

    set({
      themeId: theme.id,
      theme,
      hydrated: true,
    });
  },
  setTheme: (themeId) => {
    const theme = applyGlobalChatTheme(themeId);

    set({
      themeId: theme.id,
      theme,
      hydrated: true,
    });

    window.dispatchEvent(
      new CustomEvent("flexchat:theme-changed", {
        detail: {
          themeId: theme.id,
        },
      }),
    );
  },
  syncTheme: (themeId) => {
    const theme = applyGlobalChatTheme(themeId);

    set({
      themeId: theme.id,
      theme,
      hydrated: true,
    });
  },
}));
