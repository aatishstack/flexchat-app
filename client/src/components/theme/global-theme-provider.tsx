"use client";

import { useEffect } from "react";

import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_CHAT_THEME_ID,
  applyGlobalChatTheme,
} from "@/lib/chat-themes";

export default function GlobalThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let themeId = DEFAULT_CHAT_THEME_ID;

    try {
      themeId =
        window.localStorage.getItem(APP_THEME_STORAGE_KEY) ??
        DEFAULT_CHAT_THEME_ID;
    } catch {
      themeId = DEFAULT_CHAT_THEME_ID;
    }

    applyGlobalChatTheme(themeId);

    function handleThemeChanged(event: Event) {
      const nextThemeId =
        (event as CustomEvent<{ themeId?: string | null }>).detail?.themeId ??
        DEFAULT_CHAT_THEME_ID;

      applyGlobalChatTheme(nextThemeId);
    }

    window.addEventListener("flexchat:theme-changed", handleThemeChanged);

    return () => {
      window.removeEventListener("flexchat:theme-changed", handleThemeChanged);
    };
  }, []);

  return children;
}
