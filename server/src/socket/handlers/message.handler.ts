import {
  Server,
  Socket,
} from "socket.io";

import { db } from "../../db/index.js";

import { messages } from "../../db/schema/messages.js";

import { SOCKET_EVENTS } from "../socket-events.js";

const onlineUsers =
  new Set<string>();

export function registerMessageHandlers(
  io: Server,
  socket: Socket
) {
  const userId =
    socket.data.user.id;

  onlineUsers.add(
    userId
  );

  io.emit(
    SOCKET_EVENTS.ONLINE_USERS,
    Array.from(
      onlineUsers
    )
  );

  socket.on(
    SOCKET_EVENTS.JOIN_CONVERSATION,

    ({
      conversationId,
    }) => {
      socket.join(
        conversationId
      );
    }
  );

  socket.on(
    SOCKET_EVENTS.SEND_MESSAGE,

    async (
      data
    ) => {
      const message = {
        id:
          crypto.randomUUID(),

        text:
          data.text || "",

        attachment:
          data.attachment ||
          null,

        audio:
          data.audio ||
          null,

        

        senderId:
          userId,

        conversationId:
          data.conversationId,

        status:
          "sent",
      };

      await db
        .insert(
          messages
        )
        .values(
          message
        );

      io.to(
        data.conversationId
      ).emit(
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        {
          ...message,

          tempId:
            data.tempId,
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
        SOCKET_EVENTS.ONLINE_USERS,
        Array.from(
          onlineUsers
        )
      );
    }
  );
}