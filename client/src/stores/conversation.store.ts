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

    message: string
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
          set({
            activeConversation:
              conversation,
          }),

      updateConversationMessage:
        (
          conversationId,
          message
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
                      ) =>
                        conversation.id ===
                        conversationId
                          ? {
                              ...conversation,

                              latestMessage:
                                message,
                            }
                          : conversation
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
            })
          ),
    })
  );