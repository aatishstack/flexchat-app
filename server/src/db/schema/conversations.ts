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

      sharedThemeId:
        text(
          "shared_theme_id"
        ),

      themeUpdatedBy:
        text(
          "theme_updated_by"
        ),

      themeUpdatedAt:
        timestamp(
          "theme_updated_at"
        ),

      createdAt:
        timestamp(
          "created_at"
        )
          .defaultNow()
          .notNull(),
    }
  );
