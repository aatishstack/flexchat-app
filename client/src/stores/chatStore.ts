import { create } from "zustand";

export interface Message {
  id: number;
  text?: string;
  image?: string;
  audio?: string;
  sender: "me" | "other";
  time: string;
  seen?: boolean;
  reaction?: string;
}

interface ChatStore {
  messages: Message[];

  addMessage: (
    message: Message
  ) => void;

  setMessages: (
    messages: Message[]
  ) => void;

  updateReaction: (
    id: number,
    reaction: string
  ) => void;

  markSeen: (
    id: number
  ) => void;
}

export const useChatStore =
  create<ChatStore>((set) => ({
    messages: [],

    addMessage: (message) =>
      set((state) => ({
        messages: [
          ...state.messages,
          message,
        ],
      })),

    setMessages: (messages) =>
      set({
        messages,
      }),

    updateReaction: (
      id,
      reaction
    ) =>
      set((state) => ({
        messages:
          state.messages.map(
            (msg) =>
              msg.id === id
                ? {
                    ...msg,
                    reaction,
                  }
                : msg
          ),
      })),

    markSeen: (id) =>
      set((state) => ({
        messages:
          state.messages.map(
            (msg) =>
              msg.id === id
                ? {
                    ...msg,
                    seen: true,
                  }
                : msg
          ),
      })),
  }));