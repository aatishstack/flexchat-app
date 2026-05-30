"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type BlockEvent = {
  message: string;
  blocked: boolean;
  createdAt: string;
};

interface BlockState {
  blockedConversationIds: string[];
  blockEvents: Record<string, BlockEvent>;
  blockConversation: (conversationId: string, name: string) => void;
  unblockConversation: (conversationId: string, name: string) => void;
  isConversationBlocked: (conversationId?: string | null) => boolean;
}

function normalizeName(name: string) {
  return name.trim() || "this user";
}

export const useBlockStore = create<BlockState>()(
  persist(
    (set, get) => ({
      blockedConversationIds: [],
      blockEvents: {},

      blockConversation: (conversationId, name) =>
        set((state) => ({
          blockedConversationIds: Array.from(
            new Set([...state.blockedConversationIds, conversationId]),
          ),
          blockEvents: {
            ...state.blockEvents,
            [conversationId]: {
              message: `You have blocked ${normalizeName(name)}`,
              blocked: true,
              createdAt: new Date().toISOString(),
            },
          },
        })),

      unblockConversation: (conversationId, name) =>
        set((state) => ({
          blockedConversationIds: state.blockedConversationIds.filter(
            (id) => id !== conversationId,
          ),
          blockEvents: {
            ...state.blockEvents,
            [conversationId]: {
              message: `You have unblocked ${normalizeName(name)}`,
              blocked: false,
              createdAt: new Date().toISOString(),
            },
          },
        })),

      isConversationBlocked: (conversationId) =>
        !!conversationId &&
        get().blockedConversationIds.includes(conversationId),
    }),
    {
      name: "flexchat-blocks",
    },
  ),
);
