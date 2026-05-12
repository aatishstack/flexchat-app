import Fastify from "fastify";
import cors from "@fastify/cors";

import dotenv from "dotenv";

import { createServer } from "http";

import { createSocketServer } from "./socket/index.js";

dotenv.config();

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.get("/", async () => {
  return {
    status: "FlexChat API Running",
  };
});

const httpServer = createServer(app.server);

createSocketServer(httpServer);

const PORT = Number(process.env.PORT) || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});