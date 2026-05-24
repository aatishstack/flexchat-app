"use client";

import { useAppLifecycle } from "@/hooks/use-app-lifecycle";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAppLifecycle();

  return children;
}
