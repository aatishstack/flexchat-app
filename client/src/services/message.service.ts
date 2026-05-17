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
    | "read"
    | "failed";

  createdAt?: string;

  attachment?: string | null;

  audio?: string | null;

  tempId?: string;

  optimistic?: boolean;

  replyTo?: {
    id: string;
    text: string;
  };
}

export interface GetMessagesOptions {
  limit?: number;
  before?: string;
}

export async function getMessages(
  conversationId: string,
  options: GetMessagesOptions = {}
): Promise<Message[]> {
  const response =
    await api.get<Message[]>(
      `/messages/${conversationId}`,
      {
        params: {
          limit:
            options.limit ?? 120,
          before:
            options.before,
        },
      }
    );

  return response.data;
}
