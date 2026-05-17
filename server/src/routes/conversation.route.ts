import { FastifyInstance } from "fastify";

import { db } from "../db/index.js";

import { conversations } from "../db/schema/conversations.js";

export async function conversationRoutes(app: FastifyInstance) {
  app.get(
    "/conversations",

    async (request, reply) => {
      try {
        const data = await db.select().from(conversations);

        return data;
      } catch (error) {
        console.error(error);

        return reply.status(500).send({
          message: "Failed to fetch conversations",
        });
      }
    },
  );
}
