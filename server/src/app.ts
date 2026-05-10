import Fastify from "fastify";
import cors from "@fastify/cors";

import { authRoutes } from "./modules/auth/auth.route.js";
import { chatRoutes } from "./modules/chat/chat.route.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: "*",
  });

  await app.register(authRoutes, {
    prefix: "/api/auth",
  });

  await app.register(chatRoutes, {
    prefix: "/api/chat",
  });

  app.get("/", async () => {
    return {
      success: true,
      message: "FlexChat API running",
    };
  });

  return app;
}