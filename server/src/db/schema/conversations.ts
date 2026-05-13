import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const conversations =
  pgTable(
    "conversations",
    {
      id: text("id")
        .primaryKey(),

      name:
        text("name"),

      type:
        text("type")
          .notNull()
          .default("direct"),

      avatar:
        text("avatar"),

      createdAt:
        timestamp(
          "created_at"
        )
          .defaultNow()
          .notNull(),
    }
  );