"use client";

import { useEffect, useState } from "react";

import { X } from "lucide-react";

const STORAGE_KEY = "flexchat:https-banner-dismissed";

export default function HttpsBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const shouldShow =
        window.location.protocol !== "https:" &&
        !window.location.hostname.includes("localhost");
      const dismissed =
        window.localStorage.getItem(STORAGE_KEY) === "1";

      setVisible(shouldShow && !dismissed);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[10000] flex items-center justify-between gap-3 bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/25">
      <span>
        Warning: Calls require HTTPS or localhost. Open via localhost:3000 for
        full features.
      </span>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, "1");
          setVisible(false);
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        aria-label="Dismiss HTTPS warning"
      >
        <X size={17} />
      </button>
    </div>
  );
}
