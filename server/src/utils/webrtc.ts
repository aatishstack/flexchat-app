import crypto from "crypto";
import { env } from "../config/env.js";

/**
 * Generates dynamic TURN credentials using the TURN REST API specification.
 * Requires a shared secret configured in the Coturn server.
 * 
 * Format:
 * username: <timestamp>:<userId>
 * password: HMAC-SHA1(secret, username)
 */
export function generateTurnCredentials(userId: string) {
  const secret = env.TURN_AUTH_SECRET;
  const turnUrls = env.TURN_SERVER_URLS?.split(",").map(url => url.trim()) || [];

  if (!secret || turnUrls.length === 0) {
    return null;
  }

  // TTL: 24 hours
  const expiry = Math.floor(Date.now() / 1000) + 24 * 3600;
  const username = `${expiry}:${userId}`;
  
  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(username);
  const password = hmac.digest("base64");

  return {
    urls: turnUrls,
    username,
    credential: password,
  };
}
