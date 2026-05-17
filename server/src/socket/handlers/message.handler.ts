import {
  Server,
  Socket,
} from "socket.io";

import { db } from "../../db/index.js";
import { messages } from "../../db/schema/messages.js";
import { SOCKET_EVENTS } from "../socket-events.js";

type ConversationPayload = {
  conversationId?: string;
};

type SendMessagePayload = ConversationPayload & {
  tempId?: string;
  text?: string;
  attachment?: string | null;
  audio?: string | null;
  replyTo?: {
    id: string;
    text: string;
  };
};

type SocketMessage = {
  id: string;
  text: string;
  attachment: string | null;
  audio: string | null;
  senderId: string;
  conversationId: string;
  status: "sent";
  createdAt: string;
  tempId?: string;
  replyTo?: {
    id: string;
    text: string;
  };
};

type SendMessageAck = (
  response: {
    ok: boolean;
    error?: string;
    message?: SocketMessage;
    messageId?: string;
    serverId?: string;
    status?: "sent";
  }
) => void;

type MessageReceiptPayload =
  ConversationPayload & {
    messageId?: string;
  };

const MESSAGE_DEDUPE_TTL_MS =
  2 * 60 * 1000;

const recentClientMessages = new Map<
  string,
  SocketMessage
>();

function getConversationId(
  payload: ConversationPayload | string
) {
  if (typeof payload === "string") {
    return payload;
  }

  return payload.conversationId;
}

function getDedupeKey(
  userId: string,
  tempId?: string
) {
  if (!tempId) {
    return null;
  }

  return `${userId}:${tempId}`;
}

function rememberClientMessage(
  key: string | null,
  message: SocketMessage
) {
  if (!key) {
    return;
  }

  recentClientMessages.set(key, message);

  setTimeout(() => {
    recentClientMessages.delete(key);
  }, MESSAGE_DEDUPE_TTL_MS).unref?.();
}

export function registerMessageHandlers(
  io: Server,
  socket: Socket
) {
  const userId = socket.data.user.id as string;

  socket.on(
    SOCKET_EVENTS.JOIN_CONVERSATION,
    (payload: ConversationPayload | string) => {
      const conversationId =
        getConversationId(payload);

      if (!conversationId) {
        return;
      }

      socket.join(conversationId);
    }
  );

  socket.on(
    SOCKET_EVENTS.LEAVE_CONVERSATION,
    (payload: ConversationPayload | string) => {
      const conversationId =
        getConversationId(payload);

      if (!conversationId) {
        return;
      }

      socket.leave(conversationId);
    }
  );

  socket.on(
    SOCKET_EVENTS.SEND_MESSAGE,
    async (
      data: SendMessagePayload,
      ack?: SendMessageAck
    ) => {
      const acknowledge = (
        response: Parameters<SendMessageAck>[0]
      ) => {
        if (typeof ack === "function") {
          ack(response);
        }
      };

      if (!data.conversationId) {
        acknowledge({
          ok: false,
          error:
            "Missing conversation",
        });

        return;
      }

      const text = data.text?.trim() ?? "";

      if (!text && !data.attachment && !data.audio) {
        acknowledge({
          ok: false,
          error:
            "Cannot send an empty message",
        });

        return;
      }

      const dedupeKey =
        getDedupeKey(userId, data.tempId);
      const duplicateMessage =
        dedupeKey
          ? recentClientMessages.get(
              dedupeKey
            )
          : null;

      if (duplicateMessage) {
        acknowledge({
          ok: true,
          message:
            duplicateMessage,
          messageId:
            data.tempId ??
            duplicateMessage.id,
          serverId:
            duplicateMessage.id,
          status: "sent",
        });

        socket.emit(
          SOCKET_EVENTS.MESSAGE_DELIVERED,
          {
            messageId:
              data.tempId ??
              duplicateMessage.id,
            serverId:
              duplicateMessage.id,
            status: "sent",
          }
        );

        return;
      }

      const createdAt = new Date();
      const message = {
        id: crypto.randomUUID(),
        text,
        attachment: data.attachment ?? null,
        audio: data.audio ?? null,
        senderId: userId,
        conversationId: data.conversationId,
        status: "sent" as const,
        createdAt,
      };

      try {
        await db.insert(messages).values(message);
      } catch (error) {
        console.error(error);

        acknowledge({
          ok: false,
          error:
            "Message persistence failed",
        });

        return;
      }

      const socketMessage: SocketMessage = {
        ...message,
        createdAt: createdAt.toISOString(),
        tempId: data.tempId,
        replyTo: data.replyTo,
      };

      rememberClientMessage(
        dedupeKey,
        socketMessage
      );

      io.to(data.conversationId).emit(
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        socketMessage
      );

      acknowledge({
        ok: true,
        message:
          socketMessage,
        messageId:
          data.tempId ?? message.id,
        serverId: message.id,
        status: "sent",
      });

      socket.emit(
        SOCKET_EVENTS.MESSAGE_DELIVERED,
        {
          messageId: data.tempId ?? message.id,
          serverId: message.id,
          status: "sent",
        }
      );

      socket.to(data.conversationId).emit(
        SOCKET_EVENTS.MESSAGE_DELIVERED,
        {
          messageId: message.id,
          status: "delivered",
        }
      );
    }
  );

  socket.on(
    SOCKET_EVENTS.MESSAGE_DELIVERED,
    (payload: MessageReceiptPayload) => {
      if (
        !payload.conversationId ||
        !payload.messageId
      ) {
        return;
      }

      socket.to(payload.conversationId).emit(
        SOCKET_EVENTS.MESSAGE_DELIVERED,
        {
          messageId: payload.messageId,
          status: "delivered",
        }
      );
    }
  );

  socket.on(
    SOCKET_EVENTS.MARK_MESSAGE_SEEN,
    (payload: MessageReceiptPayload) => {
      if (
        !payload.conversationId ||
        !payload.messageId
      ) {
        return;
      }

      socket.to(payload.conversationId).emit(
        SOCKET_EVENTS.MESSAGE_SEEN,
        {
          messageId: payload.messageId,
          status: "read",
        }
      );
    }
  );
}
