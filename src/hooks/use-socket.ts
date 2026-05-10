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

  const selectedChat =
    useChatStore(
      (state) => state.selectedChat
    );

  const typingUsers =
    useChatStore(
      (state) => state.typingUsers
    );

  const setTypingUsers =
    useChatStore(
      (state) => state.setTypingUsers
    );

  const setOnlineUsers =
    useChatStore(
      (state) => state.setOnlineUsers
    );

  useEffect(() => {

    socket.connect();

    socket.emit(
      "user-online",
      userId
    );

    socket.emit(
      "join-chat",
      selectedChat
    );

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
      "online-users",
      (users) => {

        setOnlineUsers(users);
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

    socket.on(
      "user-typing",
      (typingUserId) => {

        if (
          typingUserId !== userId &&
          !typingUsers.includes(
            typingUserId
          )
        ) {

          setTypingUsers([
            ...typingUsers,
            typingUserId,
          ]);
        }
      }
    );

    socket.on(
      "user-stop-typing",
      (typingUserId) => {

        setTypingUsers(
          typingUsers.filter(
            (id) =>
              id !== typingUserId
          )
        );
      }
    );

    return () => {

      socket.disconnect();

      socket.off();
    };

  }, [
    addMessage,
    setMessages,
    userId,
    selectedChat,
    typingUsers,
    setTypingUsers,
    setOnlineUsers,
  ]);
}