import { api } from "./api";

export interface Message {
  id: string;

  text: string;

  senderId: string;

  conversationId: string;

  status:
    | "sending"
    | "sent"
    | "delivered"
    | "read";

  createdAt?: string;
}

export async function getMessages(
  conversationId: string
): Promise<Message[]> {
  const response =
    await api.get<Message[]>(
      `/messages/${conversationId}`
    );

  return response.data;
}