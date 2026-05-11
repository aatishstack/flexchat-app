import Fastify from "fastify";
import fastifyCors from "@fastify/cors";

const app = Fastify({
  logger: true,
});

app.register(fastifyCors as any, {
  origin: true,
  credentials: true,
});

export default app;