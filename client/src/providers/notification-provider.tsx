"use client";

import React from "react";
import { useFcm } from "@/hooks/use-fcm";

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useFcm();

  return <>{children}</>;
}
