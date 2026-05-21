"use client";

import {
  useState,
} from "react";

import {
  Menu,
  X,
} from "lucide-react";

interface Props {
  sidebar: React.ReactNode;

  chat: React.ReactNode;
}

export default function ChatShell({
  sidebar,
  chat,
}: Props) {
  const [open, setOpen] =
    useState(false);

  return (
    <main className="flex h-full min-h-0 w-full overflow-hidden bg-transparent text-white">
      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-50 transition-all lg:hidden ${
          open
            ? "pointer-events-auto bg-black/60 backdrop-blur-sm"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`absolute left-0 top-0 h-full w-[min(92vw,380px)] max-w-full transition-transform duration-300 ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>

        <button
          type="button"
          onClick={() =>
            setOpen(false)
          }
          className="absolute right-5 top-[calc(1rem+env(safe-area-inset-top))] flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl"
          aria-label="Close navigation"
        >
          <X size={22} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        {sidebar}
      </div>

      {/* Chat */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Mobile Topbar */}
        <div className="flex min-h-16 shrink-0 items-center border-b border-white/10 bg-[#08111f]/80 px-4 pt-[env(safe-area-inset-top)] shadow-lg shadow-black/20 backdrop-blur-2xl sm:px-5 lg:hidden">
          <button
            type="button"
            onClick={() =>
              setOpen(true)
            }
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="ml-4">
            <h2 className="font-semibold">
              FlexChat
            </h2>

            <p className="text-xs text-zinc-400">
              Premium Messaging
            </p>
          </div>
        </div>

        {chat}
      </div>
    </main>
  );
}
