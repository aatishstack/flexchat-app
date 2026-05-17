"use client";

import { ReactNode, useEffect } from "react";

import { useSocketStore } from "@/store/socket-store";
import { tokenStorage } from "@/lib/token";

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
    const token = tokenStorage.get();

    if (token) {
      connectSocket(token);
    }

    return () => {
      disconnectSocket();
    };
  }, [
    connectSocket,
    disconnectSocket,
  ]);

  return <>{children}</>;
};
