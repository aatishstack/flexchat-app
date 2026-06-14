import { and, eq, lte } from "drizzle-orm";
import { getMessaging } from "firebase-admin/messaging";
import { db } from "../db/index.js";
import { fcmTokens } from "../db/schema/fcm-tokens.js";
import { getFirebaseAdmin } from "../utils/fcm.js";

export class FcmService {
  /**
   * Removes a specific token for a user.
   */
  static async removeToken(userId: string, token: string) {
    await db
      .delete(fcmTokens)
      .where(and(eq(fcmTokens.userId, userId), eq(fcmTokens.token, token)));
  }

  /**
   * Marks a token as invalid and removes it.
   * Useful when FCM returns "messaging/registration-token-not-registered".
   */
  static async handleInvalidToken(token: string) {
    await db.delete(fcmTokens).where(eq(fcmTokens.token, token));
  }

  /**
   * Cleans up tokens that haven't been used for a long time (e.g., 60 days).
   */
  static async cleanupStaleTokens(days = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    await db.delete(fcmTokens).where(lte(fcmTokens.lastUsedAt, cutoff));
  }

  /**
   * Sends a message to a user's registered tokens.
   * This is a foundation method for later phases.
   */
  static async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ) {
    const admin = getFirebaseAdmin();
    if (!admin) return;

    const tokens = await db
      .select({ token: fcmTokens.token })
      .from(fcmTokens)
      .where(eq(fcmTokens.userId, userId));

    if (tokens.length === 0) return;

    const messaging = getMessaging(admin);

    for (const { token } of tokens) {
      try {
        await messaging.send({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data,
        });
      } catch (error: any) {
        // If token is invalid, remove it
        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token"
        ) {
          await this.handleInvalidToken(token);
        }
        console.error(`[FCM] Failed to send to token ${token}:`, error.message);
      }
    }
  }
}
