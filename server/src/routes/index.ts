import { FastifyInstance } from "fastify";

import { userRoutes } from "../modules/user/user.routes.js";
import { chatRoutes } from "../modules/chat/chat.route.js";

export async function registerRoutes(
  app: FastifyInstance
) {
  app.get("/api/v1/health", async () => {
    return {
      success: true,
      message: "FlexChat API healthy 🚀",
    };
  });

  await app.register(userRoutes, {
    prefix: "/api/v1",
  });

  await app.register(chatRoutes, {
    prefix: "/api/v1",
  });
}
