import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const fcmTokens = pgTable("fcm_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  deviceType: text("device_type").notNull().default("web"),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
