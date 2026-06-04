"use client";

import { create } from "zustand";

import { Conversation } from "@/types/conversation";

type ConversationPatch = Pick<
  Conversation,
  | "latestMessage"
  | "unreadCount"
  | "archivedAt"
  | "localThemeId"
  | "sharedThemeId"
  | "themeUpdatedAt"
  | "pinned"
  | "pinnedAt"
  | "muted"
  | "mutedAt"
  | "folder"
>;

interface ConversationState {
  activeConversationId: string | null;
  conversationPatches: Record<
    string,
    Partial<ConversationPatch>
  >;
  setActiveConversationId: (
    conversationId: string
  ) => void;
  setActiveConversation: (
    conversation: Conversation
  ) => void;
  updateConversationMessage: (
    conversationId: string,
    message: string,
    options?: {
      unread?: boolean;
      unreadCount?: number;
    }
  ) => void;
  markConversationRead: (
    conversationId: string
  ) => void;
  resetConversationState: () => void;
}

export const useConversationStore =
  create<ConversationState>(
    (set) => ({
      activeConversationId: null,
      conversationPatches: {},

      setActiveConversationId:
        (conversationId) =>
          set((state) => ({
            activeConversationId:
              conversationId,
            conversationPatches: {
              ...state.conversationPatches,
              [conversationId]: {
                ...state.conversationPatches[
                  conversationId
                ],
                unreadCount: 0,
              },
            },
          })),

      setActiveConversation:
        (conversation) =>
          set((state) => ({
            activeConversationId:
              conversation.id,
            conversationPatches: {
              ...state.conversationPatches,
              [conversation.id]: {
                ...state.conversationPatches[
                  conversation.id
                ],
                unreadCount: 0,
              },
            },
          })),

      updateConversationMessage:
        (
          conversationId,
          message,
          options
        ) =>
          set((state) => {
            const currentPatch =
              state.conversationPatches[
                conversationId
              ] ?? {};
            const currentUnread =
              currentPatch.unreadCount ?? 0;
            const nextUnreadCount =
              options?.unreadCount ??
              (options?.unread
                ? currentUnread + 1
                : currentPatch.unreadCount);

            return {
              conversationPatches: {
                ...state.conversationPatches,
                [conversationId]: {
                  ...currentPatch,
                  latestMessage:
                    message,
                  unreadCount:
                    nextUnreadCount,
                },
              },
            };
          }),

      markConversationRead:
        (conversationId) =>
          set((state) => ({
            conversationPatches: {
              ...state.conversationPatches,
              [conversationId]: {
                ...state.conversationPatches[
                  conversationId
                ],
                unreadCount: 0,
              },
            },
          })),

      resetConversationState:
        () =>
          set({
            activeConversationId:
              null,
            conversationPatches: {},
          }),
    })
  );
