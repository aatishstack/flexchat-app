import { create } from "zustand";

interface Message {
  id: number;
  text: string;
  mine: boolean;
  userId: string;
}

interface ChatState {

  selectedChat: string;

  userId: string;

  messages: Message[];

  setMessages: (
    messages: Message[]
  ) => void;

  setSelectedChat: (
    chat: string
  ) => void;

  addMessage: (
    message: Message
  ) => void;
}

export const useChatStore =
  create<ChatState>((set) => ({

    selectedChat: "Mayuri",

    userId:
      crypto.randomUUID(),

    messages: [],

    setMessages: (messages) =>
      set({
        messages,
      }),

    setSelectedChat: (chat) =>
      set({
        selectedChat: chat,
      }),

    addMessage: (message) =>
      set((state) => ({
        messages: [
          ...state.messages,
          message,
        ],
      })),
  }));