"use client";

import { create } from "zustand";

import { Conversation } from "@/types/conversation";

interface ConversationState {
  conversations:
    Conversation[];

  activeConversation:
    Conversation | null;

  setConversations: (
    conversations: Conversation[]
  ) => void;

  setActiveConversation: (
    conversation: Conversation
  ) => void;

  updateConversationMessage: (
    conversationId: string,

    message: string,

    options?: {
      unread?: boolean;
    }
  ) => void;

  markConversationRead: (
    conversationId: string
  ) => void;
}

export const useConversationStore =
  create<ConversationState>(
    (set) => ({
      conversations: [],

      activeConversation:
        null,

      setConversations:
        (
          conversations
        ) =>
          set({
            conversations,
          }),

      setActiveConversation:
        (
          conversation
        ) =>
          set((state) => ({
            activeConversation: {
              ...conversation,
              unreadCount: 0,
            },
            conversations:
              state.conversations.map(
                (item) =>
                  item.id ===
                  conversation.id
                    ? {
                        ...item,
                        unreadCount: 0,
                      }
                    : item
              ),
          })),

      updateConversationMessage:
        (
          conversationId,
          message,
          options
        ) =>
          set(
            (
              state
            ) => ({
              conversations:
                [
                  ...state.conversations
                    .map(
                      (
                        conversation
                      ) => {
                        if (
                          conversation.id !==
                          conversationId
                        ) {
                          return conversation;
                        }

                        return {
                          ...conversation,

                          latestMessage:
                            message,

                          unreadCount:
                            options?.unread
                              ? (conversation.unreadCount ??
                                  0) + 1
                              : conversation.unreadCount,
                        };
                      }
                    )
                    .sort(
                      (
                        a,
                        b
                      ) =>
                        a.id ===
                        conversationId
                          ? -1
                          : b.id ===
                              conversationId
                            ? 1
                            : 0
                    ),
                ],
              activeConversation:
                state.activeConversation?.id ===
                conversationId
                  ? {
                      ...state.activeConversation,
                      latestMessage:
                        message,
                      unreadCount:
                        options?.unread
                          ? (state
                              .activeConversation
                              .unreadCount ??
                              0) + 1
                          : state
                              .activeConversation
                              .unreadCount,
                    }
                  : state.activeConversation,
            })
          ),

      markConversationRead:
        (conversationId) =>
          set((state) => ({
            conversations:
              state.conversations.map(
                (conversation) =>
                  conversation.id ===
                  conversationId
                    ? {
                        ...conversation,
                        unreadCount: 0,
                      }
                    : conversation
              ),
            activeConversation:
              state.activeConversation?.id ===
              conversationId
                ? {
                    ...state.activeConversation,
                    unreadCount: 0,
                  }
                : state.activeConversation,
          })),
    })
  );
