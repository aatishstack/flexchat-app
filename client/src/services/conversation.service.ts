import { api } from "./api";

import { Conversation } from "@/types/conversation";

export async function getConversations() {
  const response = await api.get<Conversation[]>("/conversations");

  return response.data;
}
