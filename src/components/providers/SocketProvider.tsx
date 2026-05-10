"use client";

import { useEffect } from "react";
import { useSocketStore } from "../../store/socket.store";

export function SocketProvider() {
  const { connectSocket } = useSocketStore();

  useEffect(() => {
    connectSocket("demo-user-1");
  }, []);

  return null;
}