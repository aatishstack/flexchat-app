export type MessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read";

export interface Message {
  id: string;

  conversationId: string;

  senderId: string;

  text: string;

  createdAt: string;

  status: MessageStatus;

  optimistic?: boolean;
}