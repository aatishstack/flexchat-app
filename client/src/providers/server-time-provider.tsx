"use client";

import { useEffect } from "react";

import { syncServerTime } from "@/lib/server-time";

export default function ServerTimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const sync = () => {
      void syncServerTime().catch(() => undefined);
    };

    sync();

    const timer = window.setInterval(sync, 5 * 60 * 1000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        sync();
      }
    }

    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return children;
}
