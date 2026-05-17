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
  cursor?: string;
}

export interface MessagePage {
  messages: Message[];
  nextCursor?: string;
}

export async function getMessagePage(
  conversationId: string,
  options: GetMessagesOptions = {}
): Promise<MessagePage> {
  const response =
    await api.get<Message[]>(
      `/messages/${conversationId}`,
      {
        params: {
          limit:
            options.limit ?? 120,
          before:
            options.before,
          cursor:
            options.cursor,
        },
      }
    );

  return {
    messages:
      response.data,
    nextCursor:
      response.headers["x-next-cursor"],
  };
}

export async function getMessages(
  conversationId: string,
  options: GetMessagesOptions = {}
): Promise<Message[]> {
  const page = await getMessagePage(
    conversationId,
    options
  );

  return page.messages;
}
