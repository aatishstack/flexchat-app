import path from "path";

import Fastify from "fastify";

import cors from "@fastify/cors";

import multipart from "@fastify/multipart";

import FastifyStatic from "@fastify/static";

import { setupSocket } from "./socket/index.js";

import { authRoutes } from "./routes/auth.route.js";

import { userRoutes } from "./routes/user.route.js";

import { messageRoutes } from "./routes/messages.route.js";

import { conversationRoutes } from "./routes/conversation.route.js";

import { uploadRoutes } from "./routes/upload.route.js";

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
  FastifyStatic,
  {
    root: path.join(
      process.cwd(),
      "uploads"
    ),

    prefix:
      "/uploads/",
  }
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

setupSocket(
  app.server
);

const PORT = 5000;

await app.listen({
  port: PORT,

  host: "0.0.0.0",
});

console.log(
  `FlexChat server running on ${PORT}`
);