import { env } from "../config/env.js";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string, ip?: string) {
  const secretKey = env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    if (env.NODE_ENV === "production") {
      console.error(
        "[TURNSTILE] Secret key is missing in production. Verification failed."
      );
      return false;
    }
    // Allow bypass in non-production if secret key is not provided
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(ip && { remoteip: ip }),
      }),
    });

    const data = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      console.warn("[TURNSTILE] verification failed", {
        errorCodes: data["error-codes"],
        token: token.slice(0, 10) + "...",
      });
    }

    return data.success;
  } catch (error) {
    console.error("[TURNSTILE] verification request failed", error);
    return false;
  }
}
