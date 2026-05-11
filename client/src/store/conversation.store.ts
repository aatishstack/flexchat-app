"use client";

import { create } from "zustand";

export interface Conversation {
  id: string;

  name: string;

  lastMessage: string;

  unreadCount: number;

  online: boolean;
}

interface ConversationStore {
  activeConversationId: string;

  conversations: Conversation[];

  setActiveConversation: (
    id: string
  ) => void;
}

export const useConversationStore =
  create<ConversationStore>((set) => ({
    activeConversationId: "1",

    conversations: [
      {
        id: "1",
        name: "Mayuri",
        lastMessage:
          "Realtime system looking premium 😭",
        unreadCount: 2,
        online: true,
      },

      {
        id: "2",
        name: "Zumair",
        lastMessage:
          "Bro push GitHub backup",
        unreadCount: 0,
        online: false,
      },

      {
        id: "3",
        name: "Trisha",
        lastMessage:
          "AI model synced successfully",
        unreadCount: 5,
        online: true,
      },
    ],

    setActiveConversation: (id) =>
      set({
        activeConversationId: id,
      }),
  }));