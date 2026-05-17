import { env } from "../config/env.js";

export function getAllowedOrigins() {
  return env.CORS_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(
  origin: string | undefined
) {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  return (
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(origin)
  );
}
