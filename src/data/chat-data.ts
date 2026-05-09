import { Chat, Message } from "@/types/chat";

export const chats: Chat[] = [
  {
    id: 1,
    name: "Mayuri",
    message: "Typing...",
    time: "2m",
    unread: 2,
    online: true,
    active: true,
    avatar: "M",
  },

  {
    id: 2,
    name: "Aman",
    message: "Sent a photo",
    time: "5m",
    unread: 0,
    online: true,
    avatar: "A",
  },

  {
    id: 3,
    name: "Sarah",
    message: "Voice message",
    time: "9m",
    unread: 3,
    online: false,
    avatar: "S",
  },

  {
    id: 4,
    name: "Alex",
    message: "See you tomorrow",
    time: "12m",
    unread: 0,
    online: true,
    avatar: "A",
  },
];

export const messages: Message[] = [
  {
    id: 1,
    mine: false,
    text: "FlexChat actually feels premium 😭",
    createdAt: "10:21 PM",
  },

  {
    id: 2,
    mine: true,
    text: "Now we build realtime 😎",
    createdAt: "10:22 PM",
  },

  {
    id: 3,
    mine: false,
    text: "UI already looks production ready 🔥",
    createdAt: "10:23 PM",
  },

  {
    id: 4,
    mine: true,
    text: "Next phase is backend + sockets 👀",
    createdAt: "10:24 PM",
  },
];