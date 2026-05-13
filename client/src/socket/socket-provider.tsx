"use client";

import {
  useEffect,
} from "react";

import { socket } from "./socket";

import { SOCKET_EVENTS } from "./socket-events";

import { useSocketStore } from "@/store/socket-store";

import { useConversationStore } from "@/stores/conversation.store";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setOnlineUsers =
    useSocketStore(
      (state) =>
        state.setOnlineUsers
    );

  const addMessage =
    useSocketStore(
      (state) =>
        state.addMessage
    );

  const setTypingUsers =
    useSocketStore(
      (state) =>
        state.setTypingUsers
    );

  const updateMessageStatus =
    useSocketStore(
      (state) =>
        state.updateMessageStatus
    );

  const updateConversationMessage =
    useConversationStore(
      (state) =>
        state.updateConversationMessage
    );

  useEffect(() => {
    function onConnect() {
      useSocketStore.setState({
        isConnected: true,

        isConnecting: false,
      });
    }

    function onDisconnect() {
      useSocketStore.setState({
        isConnected: false,
      });
    }

    socket.on(
      SOCKET_EVENTS.CONNECT,
      onConnect
    );

    socket.on(
      SOCKET_EVENTS.DISCONNECT,
      onDisconnect
    );

    socket.on(
      SOCKET_EVENTS.ONLINE_USERS,

      (
        users
      ) => {
        setOnlineUsers(
          users
        );
      }
    );

    socket.on(
      SOCKET_EVENTS.RECEIVE_MESSAGE,

      (
        message
      ) => {
        if (
          message.tempId
        ) {
          updateMessageStatus(
            message.tempId,
            "sent"
          );
        }

        addMessage(
          message
        );

        updateConversationMessage(
          message.conversationId,
          message.text
        );
      }
    );

    socket.on(
      SOCKET_EVENTS.TYPING_USERS,

      (
        users
      ) => {
        setTypingUsers(
          users
        );
      }
    );

    return () => {
      socket.off(
        SOCKET_EVENTS.CONNECT,
        onConnect
      );

      socket.off(
        SOCKET_EVENTS.DISCONNECT,
        onDisconnect
      );

      socket.off(
        SOCKET_EVENTS.ONLINE_USERS
      );

      socket.off(
        SOCKET_EVENTS.RECEIVE_MESSAGE
      );

      socket.off(
        SOCKET_EVENTS.TYPING_USERS
      );
    };
  }, []);

  return children;
}