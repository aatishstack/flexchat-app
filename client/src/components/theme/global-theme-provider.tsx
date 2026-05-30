"use client";

import { useEffect } from "react";

import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_CHAT_THEME_ID,
} from "@/lib/chat-themes";
import { useThemeStore } from "@/store/theme-store";

export default function GlobalThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const syncTheme = useThemeStore((state) => state.syncTheme);

  useEffect(() => {
    hydrateTheme();

    function handleThemeChanged(event: Event) {
      const nextThemeId =
        (event as CustomEvent<{ themeId?: string | null }>).detail?.themeId ??
        DEFAULT_CHAT_THEME_ID;

      syncTheme(nextThemeId);
    }

    function handleThemeStorage(event: StorageEvent) {
      if (event.key !== APP_THEME_STORAGE_KEY) {
        return;
      }

      syncTheme(event.newValue ?? DEFAULT_CHAT_THEME_ID);
    }

    window.addEventListener("flexchat:theme-changed", handleThemeChanged);
    window.addEventListener("storage", handleThemeStorage);

    return () => {
      window.removeEventListener("flexchat:theme-changed", handleThemeChanged);
      window.removeEventListener("storage", handleThemeStorage);
    };
  }, [hydrateTheme, syncTheme]);

  return children;
}
