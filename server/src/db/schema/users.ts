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

      createdAt:
        timestamp(
          "created_at"
        )
          .defaultNow()
          .notNull(),
    }
  );
