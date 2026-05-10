import { Server } from "socket.io";

const messages: Record<
  string,
  any[]
> = {};

const onlineUsers =
  new Set<string>();

export function setupSocket(io: Server) {

  io.on("connection", (socket) => {

    console.log(
      "User connected:",
      socket.id
    );

    socket.on(
      "join-chat",
      (chatId) => {

        socket.join(chatId);

        if (
          !messages[chatId]
        ) {

          messages[chatId] = [];
        }

        socket.emit(
          "load-messages",
          messages[chatId]
        );
      }
    );

    socket.on(
      "user-online",
      (userId) => {

        onlineUsers.add(userId);

        io.emit(
          "online-users",
          Array.from(
            onlineUsers
          )
        );
      }
    );

    socket.on(
      "send-message",
      (data) => {

        const {
          chatId,
        } = data;

        if (
          !messages[chatId]
        ) {

          messages[chatId] = [];
        }

        messages[
          chatId
        ].push(data);

        io.to(chatId).emit(
          "receive-message",
          data
        );
      }
    );

    socket.on(
      "typing-start",
      ({
        chatId,
        userId,
      }) => {

        socket
          .to(chatId)
          .emit(
            "user-typing",
            userId
          );
      }
    );

    socket.on(
      "typing-stop",
      ({
        chatId,
        userId,
      }) => {

        socket
          .to(chatId)
          .emit(
            "user-stop-typing",
            userId
          );
      }
    );

    socket.on(
      "disconnect",
      () => {

        console.log(
          "User disconnected:",
          socket.id
        );
      }
    );
  });
}