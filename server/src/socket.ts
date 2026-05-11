import { Server, Socket } from "socket.io";

const onlineUsers = new Set<string>();

const roomMessages: Record<string, any[]> = {
  global: [],
  gaming: [],
  coding: [],
  music: [],
};

export const initializeSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    socket.on("user_online", (username: string) => {
      onlineUsers.add(username);

      io.emit(
        "online_users",
        Array.from(onlineUsers)
      );
    });

    socket.on(
      "join_conversation",
      (conversationId: string) => {
        socket.join(conversationId);

        socket.emit(
          "load_messages",
          roomMessages[conversationId] || []
        );
      }
    );

    socket.on("send_message", (data: any) => {
      const message = {
        ...data,
        createdAt: new Date().toISOString(),
      };

      if (!roomMessages[data.conversationId]) {
        roomMessages[data.conversationId] = [];
      }

      roomMessages[data.conversationId].push(
        message
      );

      io.to(data.conversationId).emit(
        "receive_message",
        message
      );
    });

    socket.on("typing", (data: any) => {
      socket.to(data.conversationId).emit(
        "user_typing",
        data
      );
    });

    socket.on("stop_typing", (data: any) => {
      socket.to(data.conversationId).emit(
        "user_stop_typing",
        data
      );
    });

    socket.on("disconnect", () => {
      console.log(`Disconnected: ${socket.id}`);
    });
  });
};