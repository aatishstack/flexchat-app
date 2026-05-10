import { z } from "zod";

export const sendMessageSchema =
  z.object({
    conversationId:
      z.string().optional(),

    senderId: z.string(),

    content: z.string().min(1),
  });