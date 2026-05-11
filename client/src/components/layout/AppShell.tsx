"use client";

import { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-[#04040a] text-white">
      {children}
    </div>
  );
}