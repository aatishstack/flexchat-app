import {
  FastifyInstance,
} from "fastify";

import {
  eq,
  desc,
} from "drizzle-orm";

import { db } from "../db/index.js";

import { messages } from "../db/schema/messages.js";

export async function messageRoutes(
  app: FastifyInstance
) {
  // GET HISTORY
  app.get(
    "/messages/:conversationId",

    async (
      request
    ) => {
      const {
        conversationId,
      } =
        request.params as {
          conversationId: string;
        };

      const data =
        await db
          .select()
          .from(messages)
          .where(
            eq(
              messages.conversationId,
              conversationId
            )
          )
          .orderBy(
            desc(
              messages.createdAt
            )
          );

      return data.reverse();
    }
  );
}