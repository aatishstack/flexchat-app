"use client";

import { RefreshCw } from "lucide-react";

export default function ChatError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex h-dvh min-h-svh items-center justify-center bg-[#050816] px-5 text-center text-white">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl">
        <h1 className="text-xl font-semibold">
          Chat needs a refresh
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Realtime state hit an unexpected error. Your account and messages are safe.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2481CC] px-5 text-sm font-semibold text-white shadow-xl shadow-sky-700/25 transition hover:bg-[#2F8ED8]"
        >
          <RefreshCw size={16} />
          Retry chat
        </button>
      </div>
    </main>
  );
}
