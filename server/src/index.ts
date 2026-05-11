import Fastify from "fastify";
import cors from "@fastify/cors";

import { Server } from "socket.io";

import { authRoutes } from "./routes/auth.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(
  authRoutes
);

app.get("/", async () => {
  return {
    status:
      "FlexChat Backend Running",
  };
});

app.get(
  "/conversations",
  async () => {

    return [
      {
        id: 1,
        title: "Mayuri",
      },
      {
        id: 2,
        title: "Alex",
      },
      {
        id: 3,
        title: "Rahul",
      },
      {
        id: 4,
        title: "Sophie",
      },
      {
        id: 5,
        title: "FlexBot",
      },
    ];
  }
);

app.get(
  "/messages",
  async () => {

    return [];
  }
);

/* SOCKET.IO */
const io = new Server(
  app.server,
  {
    cors: {
      origin: "*",
      credentials: true,
    },
  }
);

let onlineUsers = 0;

io.on(
  "connection",
  (socket) => {

    console.log(
      "User connected:",
      socket.id
    );

    onlineUsers++;

    io.emit(
      "online_users",
      onlineUsers
    );

    socket.on(
      "send_message",
      (data) => {

        socket.broadcast.emit(
          "receive_message",
          data
        );
      }
    );

    socket.on(
      "typing",
      () => {

        socket.broadcast.emit(
          "user_typing"
        );
      }
    );

    socket.on(
      "stop_typing",
      () => {

        socket.broadcast.emit(
          "user_stop_typing"
        );
      }
    );

    socket.on(
      "disconnect",
      () => {

        onlineUsers--;

        io.emit(
          "online_users",
          onlineUsers
        );
      }
    );
  }
);

try {

  await app.listen({
    port: 5000,
    host: "0.0.0.0",
  });

  console.log(
    "FlexChat Backend Running on 5000"
  );

} catch (error) {

  console.error(
    error
  );

  process.exit(1);
}