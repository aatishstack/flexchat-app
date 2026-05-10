import { Server, Socket } from "socket.io";

type OnlineUser = {
  userId: string;
  socketId: string;
};

const onlineUsers = new Map<string, string>();

export const setupSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("user:join", (userId: string) => {
      onlineUsers.set(userId, socket.id);

      socket.join(userId);

      io.emit("presence:update", {
        userId,
        status: "online",
      });

      console.log(`User joined: ${userId}`);
    });

    socket.on(
      "message:send",
      async (data: {
        conversationId: string;
        senderId: string;
        receiverId: string;
        content: string;
      }) => {
        io.to(data.receiverId).emit("message:new", {
          ...data,
          createdAt: new Date(),
        });

        io.to(data.senderId).emit("message:new", {
          ...data,
          createdAt: new Date(),
        });

        console.log("Realtime message:", data.content);
      }
    );

    socket.on("typing:start", (data) => {
      io.to(data.receiverId).emit("typing:start", data);
    });

    socket.on("typing:stop", (data) => {
      io.to(data.receiverId).emit("typing:stop", data);
    });

    socket.on("disconnect", () => {
      let disconnectedUserId: string | null = null;

      onlineUsers.forEach((socketId, userId) => {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
        }
      });

      if (disconnectedUserId) {
        io.emit("presence:update", {
          userId: disconnectedUserId,
          status: "offline",
        });
      }

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};