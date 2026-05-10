import { Server }
from "socket.io";

import { createMessage }
from "../chat/chat.service.js";

export function setupSocket(server: any) {

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {

    console.log(
      "Socket connected:",
      socket.id
    );

    socket.on(
      "join_conversation",

      (conversationId: string) => {

        socket.join(conversationId);

        console.log(
          `Joined: ${conversationId}`
        );
      }
    );

    socket.on(
      "send_message",

      async (data) => {

        try {

          const {
            conversationId,
            senderId,
            content,
          } = data;

          const message =
            await createMessage(
              conversationId,
              senderId,
              content
            );

          io.to(conversationId).emit(
            "receive_message",
            message
          );

        } catch (error) {

          console.log(error);
        }
      }
    );

    socket.on(
      "disconnect",

      () => {

        console.log(
          "Socket disconnected:",
          socket.id
        );
      }
    );
  });
}