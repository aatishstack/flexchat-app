"use client";

import { useEffect } from "react";

import { socket } from "@/services/socket";

import { useChatStore } from "@/store/chat-store";

export function useSocket() {

  const addMessage =
    useChatStore(
      (state) => state.addMessage
    );

  const setMessages =
    useChatStore(
      (state) => state.setMessages
    );

  const userId =
    useChatStore(
      (state) => state.userId
    );

  useEffect(() => {

    socket.connect();

    socket.on(
      "connect",
      () => {

        console.log(
          "Socket connected:",
          socket.id
        );
      }
    );

    socket.on(
      "load-messages",
      (messages) => {

        const formatted =
          messages.map(
            (message: any) => ({
              ...message,

              mine:
                message.userId ===
                userId,
            })
          );

        setMessages(formatted);
      }
    );

    socket.on(
      "receive-message",
      (data) => {

        addMessage({
          id: data.id,

          text: data.text,

          mine:
            data.userId === userId,

          userId: data.userId,
        });
      }
    );

    return () => {
      socket.disconnect();
    };

  }, [
    addMessage,
    setMessages,
    userId,
  ]);
}