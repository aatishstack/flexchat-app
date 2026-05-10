import { FastifyInstance }
  from "fastify";

import {
  createConversationController,
  sendMessageController,
  getMessagesController,
} from "./chat.controller.js";

import { authMiddleware }
  from "../../middleware/auth.middleware.js";

export async function chatRoutes(
  app: FastifyInstance
) {
  app.post(
    "/conversation",

    {
      preHandler: authMiddleware as any,
    },

    createConversationController as any
  );

  app.post(
    "/message",

    {
      preHandler: authMiddleware as any,
    },

    sendMessageController as any
  );

  app.get(
    "/messages/:conversationId",

    {
      preHandler: authMiddleware as any,
    },

    getMessagesController as any
  );
}