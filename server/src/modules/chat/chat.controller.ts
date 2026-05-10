import {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  createConversation,
  createMessage,
  getMessages,
} from "./chat.service.js";

export async function
createConversationController(
  request: any,
  reply: FastifyReply
) {
  try {
    const {
      targetUserId,
    } = request.body;

    const conversation =
      await createConversation(
        request.user.userId,
        targetUserId
      );

    return reply.send({
      success: true,
      conversation,
    });

  } catch (error) {
    console.log(error);

    return reply.status(500).send({
      success: false,
      message:
        "Conversation creation failed",
    });
  }
}

export async function
sendMessageController(
  request: any,
  reply: FastifyReply
) {
  try {
    const {
      conversationId,
      content,
    } = request.body;

    const message =
      await createMessage(
        conversationId,
        request.user.userId,
        content
      );

    return reply.send({
      success: true,
      message,
    });

  } catch (error) {
    console.log(error);

    return reply.status(500).send({
      success: false,
      message:
        "Message send failed",
    });
  }
}

export async function
getMessagesController(
  request: FastifyRequest<{
    Params: {
      conversationId: string;
    };
  }>,

  reply: FastifyReply
) {
  try {
    const messages =
      await getMessages(
        request.params.conversationId
      );

    return reply.send({
      success: true,
      messages,
    });

  } catch (error) {
    console.log(error);

    return reply.status(500).send({
      success: false,
      message:
        "Messages fetch failed",
    });
  }
}