import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET:
    z.string()
      .min(1)
      .default(
        "flexchat_local_dev_secret_change_me"
      ),
  NODE_ENV:
    z
      .enum([
        "development",
        "test",
        "production",
      ])
      .default("development"),
  PORT: z.coerce.number().default(8080),
  HOST:
    z.string().default("0.0.0.0"),
  CORS_ORIGIN:
    z
      .string()
      .default("http://localhost:3000"),
  FRONTEND_URL:
    z
      .string()
      .url()
      .default("http://localhost:3000"),
  CLIENT_URL:
    z
      .string()
      .url()
      .optional(),
  PUBLIC_API_URL:
    z
      .string()
      .url()
      .default("http://localhost:5000"),
  GOOGLE_CLIENT_ID:
    z.string().optional(),
  GOOGLE_CLIENT_SECRET:
    z.string().optional(),
  GOOGLE_CALLBACK_URL:
    z
      .string()
      .url()
      .optional(),
  RATE_LIMIT_MAX:
    z.coerce.number().default(120),
  RATE_LIMIT_WINDOW:
    z.string().default("1 minute"),
  SOCKET_PING_INTERVAL_MS:
    z.coerce.number().default(18_000),
  SOCKET_PING_TIMEOUT_MS:
    z.coerce.number().default(8_000),
  SOCKET_CONNECT_TIMEOUT_MS:
    z.coerce.number().default(10_000),
  SOCKET_UPGRADE_TIMEOUT_MS:
    z.coerce.number().default(20_000),
  UPLOAD_RETENTION_HOURS:
    z.coerce.number().min(1).default(168),
  UPLOAD_CLEANUP_INTERVAL_MINUTES:
    z.coerce.number().min(5).default(60),
}).superRefine((env, context) => {
  if (
    env.NODE_ENV === "production" &&
    env.JWT_SECRET.length < 32
  ) {
    context.addIssue({
      code: "custom",
      path: ["JWT_SECRET"],
      message:
        "JWT_SECRET must be at least 32 characters in production",
    });
  }

  if (env.FRONTEND_URL.endsWith("/")) {
    context.addIssue({
      code: "custom",
      path: ["FRONTEND_URL"],
      message:
        "FRONTEND_URL must be the exact origin without a trailing slash",
    });
  }

  if (env.CLIENT_URL?.endsWith("/")) {
    context.addIssue({
      code: "custom",
      path: ["CLIENT_URL"],
      message:
        "CLIENT_URL must be the exact origin without a trailing slash",
    });
  }

  if (env.PUBLIC_API_URL.endsWith("/")) {
    context.addIssue({
      code: "custom",
      path: ["PUBLIC_API_URL"],
      message:
        "PUBLIC_API_URL must be the exact API origin without a trailing slash",
    });
  }

  if (env.GOOGLE_CALLBACK_URL?.endsWith("/")) {
    context.addIssue({
      code: "custom",
      path: ["GOOGLE_CALLBACK_URL"],
      message:
        "GOOGLE_CALLBACK_URL must be the exact callback URL without a trailing slash",
    });
  }

  if (
    env.NODE_ENV === "production" &&
    (env.PUBLIC_API_URL.startsWith("http://") ||
      env.FRONTEND_URL.startsWith("http://") ||
      env.CLIENT_URL?.startsWith("http://") ||
      env.GOOGLE_CALLBACK_URL?.startsWith("http://"))
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Production OAuth/API/client URLs must use HTTPS",
    });
  }
});

export const env = envSchema.parse(process.env);
