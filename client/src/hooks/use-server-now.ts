"use client";

import { useEffect, useState } from "react";

import {
  getServerNow,
  subscribeServerTime,
  syncServerTime,
} from "@/lib/server-time";

export function useServerNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => getServerNow());

  useEffect(() => {
    function updateNow() {
      setNow(getServerNow());
    }

    const unsubscribe = subscribeServerTime(updateNow);
    const timer = window.setInterval(updateNow, intervalMs);

    void syncServerTime().catch(() => undefined);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
