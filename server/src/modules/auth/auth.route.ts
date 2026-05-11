import { FastifyInstance } from "fastify";

async function authRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      message: "Auth route working",
    };
  });
}

export default authRoutes;