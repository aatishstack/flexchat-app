import { FastifyInstance } from "fastify";

export async function chatRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      message: "Chat route working",
    };
  });
}
