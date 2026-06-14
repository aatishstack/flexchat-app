import {
  boolean,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users =
  pgTable(
    "users",
    {
      id: text("id")
        .primaryKey(),

      username:
        text(
          "username"
        )
          .notNull()
          .unique(),

      email:
        text(
          "email"
        )
          .notNull()
          .unique(),

      password:
        text(
          "password"
        ).notNull(),

      avatar:
        text(
          "avatar"
        ),

      avatarPublicId:
        text(
          "avatar_public_id"
        ),

      avatarSecureUrl:
        text(
          "avatar_secure_url"
        ),

      avatarResourceType:
        text(
          "avatar_resource_type"
        ),

      phoneNumber:
        text(
          "phone_number"
        ),

      phoneNumberNormalized:
        text(
          "phone_number_normalized"
        )
          .unique(),

      isDeleted:
        boolean(
          "is_deleted"
        )
          .default(false)
          .notNull(),

      deletedAt:
        timestamp(
          "deleted_at"
        ),

      lastSeenAt:
        timestamp(
          "last_seen_at"
        ),

      createdAt:
        timestamp(
          "created_at"
        )
          .defaultNow()
          .notNull(),
    }
  );
