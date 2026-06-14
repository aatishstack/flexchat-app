import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const mediaAssets = pgTable(
  "media_assets",
  {
    publicId: text("public_id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    clientUploadId: text("client_upload_id"),
    purpose: text("purpose").notNull(),
    secureUrl: text("secure_url").notNull(),
    deliveryUrl: text("delivery_url").notNull(),
    resourceType: text("resource_type").notNull(),
    kind: text("kind").notNull(),
    mimeType: text("mime_type").notNull(),
    fileName: text("file_name").notNull(),
    bytes: integer("bytes").notNull(),
    format: text("format"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    attachedAt: timestamp("attached_at"),
    deleteRequestedAt: timestamp("delete_requested_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    ownerCreatedAtIdx: index(
      "media_assets_owner_created_at_idx",
    ).on(table.ownerUserId, table.createdAt),
    cleanupIdx: index(
      "media_assets_cleanup_idx",
    ).on(
      table.deletedAt,
      table.deleteRequestedAt,
      table.attachedAt,
      table.createdAt,
    ),
    ownerClientUploadIdx: uniqueIndex(
      "media_assets_owner_client_upload_idx",
    ).on(table.ownerUserId, table.clientUploadId),
  }),
);
