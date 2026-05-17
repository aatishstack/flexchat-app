import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { setupSocket } from "./socket/index.js";

const app = await buildApp();

setupSocket(app.server);

await app.listen({
  port: env.PORT,
  host: env.HOST,
});

app.log.info(
  `FlexChat server running on ${env.HOST}:${env.PORT}`
);
