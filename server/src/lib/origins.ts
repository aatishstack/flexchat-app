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

  if (env.NODE_ENV !== "production") {
    try {
      const parsedOrigin = new URL(origin);

      if (
        ["localhost", "127.0.0.1"].includes(parsedOrigin.hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(parsedOrigin.hostname) ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsedOrigin.hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(parsedOrigin.hostname)
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return (
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(origin)
  );
}
