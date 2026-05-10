import { FastifyInstance } from "fastify";

export async function userRoutes(
  app: FastifyInstance
) {
  app.get("/users", async () => {
    return {
      success: true,
      users: [],
    };
  });
}