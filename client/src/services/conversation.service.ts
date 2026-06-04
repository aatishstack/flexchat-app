import { api } from "./api";

import {
  Conversation,
  ConversationFolder,
} from "@/types/conversation";

export interface GetConversationsOptions {
  limit?: number;
  cursor?: string;
}

export interface ConversationPage {
  conversations: Conversation[];
  nextCursor?: string;
}

export async function getConversationPage(
  options: GetConversationsOptions = {}
): Promise<ConversationPage> {
  const response =
    await api.get<Conversation[]>("/conversations", {
      params: {
        limit:
          options.limit ?? 200,
        cursor:
          options.cursor,
      },
    });

  return {
    conversations:
      response.data,
    nextCursor:
      response.headers["x-next-cursor"],
  };
}

export async function getConversations(
  options: GetConversationsOptions = {}
) {
  const page =
    await getConversationPage(options);

  return page.conversations;
}

export async function createDirectConversation(
  targetUserId: string
) {
  const response =
    await api.post<Conversation>(
      "/conversations/direct",
      {
        targetUserId,
      }
    );

  return response.data;
}

export async function setConversationArchived(
  conversationId: string,
  archived: boolean
) {
  const response =
    await api.patch<Conversation>(
      `/conversations/${conversationId}/archive`,
      {
        archived,
      }
    );

  return response.data;
}

export async function deleteConversation(
  conversationId: string
) {
  const response =
    await api.delete<{
      ok: boolean;
      conversationId: string;
      hiddenAt: string;
    }>(
      `/conversations/${conversationId}`
    );

  return response.data;
}

export async function updateConversationSettings(input: {
  conversationId: string;
  pinned?: boolean;
  muted?: boolean;
  folder?: ConversationFolder | null;
}) {
  const response =
    await api.patch<Conversation>(
      `/conversations/${input.conversationId}/settings`,
      {
        pinned:
          input.pinned,
        muted:
          input.muted,
        folder:
          input.folder,
      }
    );

  return response.data;
}

export async function setConversationRead(
  conversationId: string,
  read: boolean
) {
  const response =
    await api.patch<Conversation>(
      `/conversations/${conversationId}/read`,
      {
        read,
      }
    );

  return response.data;
}

export async function applyConversationTheme(input: {
  conversationId: string;
  themeId: string | null;
  scope: "me" | "both";
}) {
  const response =
    await api.patch<Conversation>(
      `/conversations/${input.conversationId}/theme`,
      {
        themeId: input.themeId,
        scope: input.scope,
      }
    );

  return response.data;
}
