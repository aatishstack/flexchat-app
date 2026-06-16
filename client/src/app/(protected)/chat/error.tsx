"use client";

import { RefreshCw } from "lucide-react";

export default function ChatError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex h-dvh min-h-svh items-center justify-center bg-[#0C0C10] px-5 text-center text-white">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl">
        <h1 className="text-xl font-bold">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          We encountered an unexpected error. Don&apos;t worry, your messages are safe.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#7C4FF0] px-5 text-sm font-bold text-white shadow-xl shadow-[#7C4FF0]/25 transition hover:bg-[#8B5CF6]"
        >
          <RefreshCw size={16} />
          Retry chat
        </button>
      </div>
    </main>
  );
}
