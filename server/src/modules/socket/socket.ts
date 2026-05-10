import { Server, Socket } from "socket.io";

export const registerSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);

      console.log(
        `Socket ${socket.id} joined conversation ${conversationId}`
      );
    });

    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(conversationId);

      console.log(
        `Socket ${socket.id} left conversation ${conversationId}`
      );
    });

    socket.on("send_message", (data) => {
      io.to(data.conversationId).emit("receive_message", data);

      console.log("Message received:", data);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};