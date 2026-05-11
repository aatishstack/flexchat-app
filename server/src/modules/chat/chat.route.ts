import { FastifyInstance } from "fastify";

async function chatRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      message: "Chat route working",
    };
  });
}

export default chatRoutes;