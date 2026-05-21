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

  editedAt?: string;

  deletedAt?: string;

  reactions?: {
    emoji: string;
    count: number;
  }[];

  forwardedFrom?: {
    messageId: string;
    senderId?: string | null;
    senderName?: string | null;
  };

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

export async function editMessage(input: {
  messageId: string;
  conversationId: string;
  text: string;
}) {
  const response =
    await api.patch<Message>(
      `/messages/${input.messageId}`,
      {
        conversationId:
          input.conversationId,
        text: input.text,
      }
    );

  return response.data;
}

export async function deleteMessage(input: {
  messageId: string;
  conversationId: string;
}) {
  const response =
    await api.delete<Message>(
      `/messages/${input.messageId}`,
      {
        data: {
          conversationId:
            input.conversationId,
        },
      }
    );

  return response.data;
}

export async function reactToMessage(input: {
  messageId: string;
  conversationId: string;
  emoji: string;
}) {
  const response =
    await api.post<Message>(
      `/messages/${input.messageId}/reactions`,
      {
        conversationId:
          input.conversationId,
        emoji: input.emoji,
      }
    );

  return response.data;
}

export async function forwardMessage(input: {
  messageId: string;
  targetConversationIds: string[];
}) {
  const response =
    await api.post<{
      messages: Message[];
    }>(
      `/messages/${input.messageId}/forward`,
      {
        targetConversationIds:
          input.targetConversationIds,
      }
    );

  return response.data.messages;
}
