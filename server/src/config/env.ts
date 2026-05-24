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
  PUBLIC_API_URL:
    z
      .string()
      .url()
      .default("http://localhost:5000"),
  RATE_LIMIT_MAX:
    z.coerce.number().default(120),
  RATE_LIMIT_WINDOW:
    z.string().default("1 minute"),
  SOCKET_PING_INTERVAL_MS:
    z.coerce.number().default(25_000),
  SOCKET_PING_TIMEOUT_MS:
    z.coerce.number().default(45_000),
  UPLOAD_RETENTION_HOURS:
    z.coerce.number().min(1).default(168),
  UPLOAD_CLEANUP_INTERVAL_MINUTES:
    z.coerce.number().min(5).default(60),
  FIREBASE_SERVICE_ACCOUNT_JSON:
    z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_BASE64:
    z.string().optional(),
  FIREBASE_PROJECT_ID:
    z.string().optional(),
  FIREBASE_CLIENT_EMAIL:
    z.string().optional(),
  FIREBASE_PRIVATE_KEY:
    z.string().optional(),
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
});

export const env = envSchema.parse(process.env);
