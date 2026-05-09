import Fastify from "fastify";

import cors from "@fastify/cors";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: "*",
  });

  app.get("/", async () => {
    return {
      message:
        "FlexChat backend running 🚀",
    };
  });

  return app;
}