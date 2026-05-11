"use client";

import { useEffect } from "react";

import { connect, disconnect } from "../../services/socket";

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return <>{children}</>;
}