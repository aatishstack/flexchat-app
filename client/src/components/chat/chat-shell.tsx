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
    <main className="flex h-screen overflow-hidden bg-[#070B14] text-white">
      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-50 transition-all lg:hidden ${
          open
            ? "pointer-events-auto bg-black/60 backdrop-blur-sm"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`absolute left-0 top-0 h-full w-[320px] transition-transform duration-300 ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>

        <button
          onClick={() =>
            setOpen(false)
          }
          className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl"
        >
          <X size={22} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        {sidebar}
      </div>

      {/* Chat */}
      <div className="relative flex flex-1 flex-col">
        {/* Mobile Topbar */}
        <div className="flex h-16 items-center border-b border-white/10 bg-black/20 px-5 backdrop-blur-xl lg:hidden">
          <button
            onClick={() =>
              setOpen(true)
            }
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
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