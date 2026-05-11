import { Server } from "socket.io";

export const registerSocketHandlers = (
  io: Server
) => {
  io.on(
    "connection",
    (socket) => {
      console.log(
        "Socket connected:",
        socket.id
      );

      socket.on(
        "join_conversation",
        (
          conversationId: string
        ) => {
          socket.join(
            conversationId
          );

          console.log(
            "Joined:",
            conversationId
          );
        }
      );

      socket.on(
        "send_message",
        (data) => {
          console.log(
            "Message:",
            data
          );

          io.to(
            data.conversationId
          ).emit(
            "receive_message",
            {
              id:
                crypto.randomUUID(),

              conversationId:
                data.conversationId,

              senderId:
                data.senderId,

              text: data.text,

              createdAt:
                new Date().toISOString(),
            }
          );
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
    }
  );
};