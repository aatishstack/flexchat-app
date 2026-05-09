import { Server } from "socket.io";

const messages: any[] = [];

export function setupSocket(io: Server) {

  io.on("connection", (socket) => {

    console.log(
      "User connected:",
      socket.id
    );

    socket.emit(
      "load-messages",
      messages
    );

    socket.on(
      "send-message",
      (data) => {

        messages.push(data);

        io.emit(
          "receive-message",
          data
        );
      }
    );

    socket.on("disconnect", () => {

      console.log(
        "User disconnected:",
        socket.id
      );
    });
  });
}