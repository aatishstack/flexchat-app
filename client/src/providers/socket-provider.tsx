"use client";

import { ReactNode, useEffect } from "react";

import { useSocketStore } from "@/store/socket-store";

interface Props {
  children: ReactNode;
}

export const SocketProvider = ({
  children,
}: Props) => {
  const connectSocket = useSocketStore(
    (state) => state.connectSocket
  );

  const disconnectSocket = useSocketStore(
    (state) => state.disconnectSocket
  );

  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  return <>{children}</>;
};