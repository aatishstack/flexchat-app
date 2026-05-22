import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const messages =
  pgTable(
    "messages",
    {
      id: text("id")
        .primaryKey(),

      conversationId:
        text(
          "conversation_id"
        ).notNull(),

      senderId:
        text(
          "sender_id"
        ).notNull(),

      text:
        text("text")
          .notNull(),

      attachment:
        text("attachment"),

      audio:
        text("audio"),

      forwardedFromMessageId:
        text(
          "forwarded_from_message_id"
        ),

      forwardedFromSenderId:
        text(
          "forwarded_from_sender_id"
        ),

      forwardedFromSenderName:
        text(
          "forwarded_from_sender_name"
        ),

      replyToMessageId:
        text(
          "reply_to_message_id"
        ),

      replyToText:
        text(
          "reply_to_text"
        ),

      editedAt:
        timestamp(
          "edited_at"
        ),

      deletedAt:
        timestamp(
          "deleted_at"
        ),

      status:
        text("status")
          .default(
            "sent"
          )
          .notNull(),

      createdAt:
        timestamp(
          "created_at"
        )
          .defaultNow()
          .notNull(),
    },
    (table) => ({
      conversationCreatedAtIdx: index(
        "messages_conversation_created_at_idx"
      ).on(
        table.conversationId,
        table.createdAt
      ),
      conversationCreatedAtIdIdx: index(
        "messages_conversation_created_at_id_idx"
      ).on(
        table.conversationId,
        table.createdAt,
        table.id
      ),
      conversationStatusIdx: index(
        "messages_conversation_status_idx"
      ).on(
        table.conversationId,
        table.status
      ),
      conversationUnreadIdx: index(
        "messages_conversation_unread_idx"
      ).on(
        table.conversationId,
        table.status,
        table.senderId
      ),
      conversationDeletedIdx: index(
        "messages_conversation_deleted_idx"
      ).on(
        table.conversationId,
        table.deletedAt
      ),
      forwardedSourceIdx: index(
        "messages_forwarded_source_idx"
      ).on(
        table.forwardedFromMessageId
      ),
      replySourceIdx: index(
        "messages_reply_source_idx"
      ).on(
        table.replyToMessageId
      ),
    })
  );

export const messageReactions =
  pgTable(
    "message_reactions",
    {
      id: text("id")
        .primaryKey(),

      messageId:
        text(
          "message_id"
        ).notNull(),

      conversationId:
        text(
          "conversation_id"
        ).notNull(),

      userId:
        text(
          "user_id"
        ).notNull(),

      emoji:
        text("emoji")
          .notNull(),

      createdAt:
        timestamp(
          "created_at"
        )
          .defaultNow()
          .notNull(),
    },
    (table) => ({
      messageUserUniqueIdx: uniqueIndex(
        "message_reactions_message_user_unique_idx"
      ).on(
        table.messageId,
        table.userId
      ),
      messageEmojiIdx: index(
        "message_reactions_message_emoji_idx"
      ).on(
        table.messageId,
        table.emoji
      ),
      conversationIdx: index(
        "message_reactions_conversation_idx"
      ).on(
        table.conversationId
      ),
    })
  );
