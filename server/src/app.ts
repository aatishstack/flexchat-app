import Fastify from "fastify";

import cors from "@fastify/cors";

import multipart from "@fastify/multipart";

import { authRoutes } from "./routes/auth.route.js";

import { messageRoutes } from "./routes/messages.route.js";

import { userRoutes } from "./routes/user.route.js";

import { conversationRoutes } from "./routes/conversation.route.js";

import { uploadRoutes } from "./routes/upload.route.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,

    credentials: true,
  });

  await app.register(
    multipart
  );

  await app.register(
    authRoutes
  );

  await app.register(
    userRoutes
  );

  await app.register(
    messageRoutes
  );

  await app.register(
    conversationRoutes
  );

  await app.register(
    uploadRoutes
  );

  app.get("/", async () => {
    return {
      message:
        "FlexChat API running",
    };
  });

  return app;
}