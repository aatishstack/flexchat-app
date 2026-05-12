import { Server, Socket } from "socket.io";

const onlineUsers =
  new Set<string>();

export function registerSocketEvents(
  io: Server,
  socket: Socket
) {

  console.log(
    `Socket connected: ${socket.id}`
  );

  const userId =
    socket.id;

  onlineUsers.add(
    userId
  );

  io.emit(
    "online_users",
    onlineUsers.size
  );

  socket.on(
    "join_conversation",
    (conversationId: string) => {

      socket.join(
        conversationId
      );

      console.log(
        `Joined: ${conversationId}`
      );
    }
  );

  socket.on(
    "leave_conversation",
    (conversationId: string) => {

      socket.leave(
        conversationId
      );

      console.log(
        `Left: ${conversationId}`
      );
    }
  );

  socket.on(
    "typing_start",
    (conversationId: string) => {

      socket
        .to(conversationId)
        .emit(
          "typing_start"
        );
    }
  );

  socket.on(
    "typing_stop",
    (conversationId: string) => {

      socket
        .to(conversationId)
        .emit(
          "typing_stop"
        );
    }
  );

  socket.on(
    "send_message",
    (data) => {

      io.to(
        data.conversationId
      ).emit(
        "receive_message",
        {
          id:
            data.id,

          text:
            data.text,

          image:
            data.image,

          audio:
            data.audio,

          sender:
            data.sender,

          time:
            data.time,

          conversationId:
            data.conversationId,
        }
      );
    }
  );

  socket.on(
    "disconnect",
    () => {

      onlineUsers.delete(
        userId
      );

      io.emit(
        "online_users",
        onlineUsers.size
      );

      console.log(
        `Socket disconnected: ${socket.id}`
      );
    }
  );
}