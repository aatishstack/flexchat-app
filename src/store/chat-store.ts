import { create } from "zustand";

interface Message {
  id: number;
  text: string;
  mine: boolean;
  userId: string;
  chatId: string;
}

interface ChatUser {
  id: string;
  name: string;
}

interface ChatState {

  selectedChat: string;

  chats: ChatUser[];

  userId: string;

  messages: Message[];

  typingUsers: string[];

  onlineUsers: string[];

  setMessages: (
    messages: Message[]
  ) => void;

  setSelectedChat: (
    chat: string
  ) => void;

  addMessage: (
    message: Message
  ) => void;

  setTypingUsers: (
    users: string[]
  ) => void;

  setOnlineUsers: (
    users: string[]
  ) => void;
}

export const useChatStore =
  create<ChatState>((set) => ({

    selectedChat: "Mayuri",

    chats: [
      {
        id: "Mayuri",
        name: "Mayuri",
      },
      {
        id: "Aman",
        name: "Aman",
      },
      {
        id: "Zumair",
        name: "Zumair",
      },
    ],

    userId:
      crypto.randomUUID(),

    messages: [],

    typingUsers: [],

    onlineUsers: [],

    setMessages: (messages) =>
      set({
        messages,
      }),

    setSelectedChat: (chat) =>
      set({
        selectedChat: chat,

        messages: [],
      }),

    addMessage: (message) =>
      set((state) => ({
        messages: [
          ...state.messages,
          message,
        ],
      })),

    setTypingUsers: (users) =>
      set({
        typingUsers: users,
      }),

    setOnlineUsers: (users) =>
      set({
        onlineUsers: users,
      }),
  }));