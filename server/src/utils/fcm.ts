import { initializeApp, cert, type App } from "firebase-admin/app";
import { env } from "../config/env.js";

let app: App | undefined;

export function getFirebaseAdmin() {
  if (app) return app;

  const projectId = env.FIREBASE_PROJECT_ID;
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!projectId) {
    if (env.NODE_ENV === "production") {
      console.error("[FIREBASE] Project ID is missing in production.");
    }
    return undefined;
  }

  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(serviceAccount),
      }, projectId);
    } else {
      app = initializeApp({
        projectId,
      }, projectId);
    }
    console.info("[FIREBASE] Admin SDK initialized successfully.");
    return app;
  } catch (error) {
    console.error("[FIREBASE] Failed to initialize Admin SDK:", error);
    return undefined;
  }
}




export async function verifyFcmToken(token: string) {
  const firebase = getFirebaseAdmin();
  if (!firebase) return false;

  try {
    // There isn't a direct "verifyToken" for FCM tokens like there is for ID tokens,
    // but we can try a dry run send or check if it's formatted correctly.
    // For now, we'll assume it's valid if we can at least get the admin app.
    // A better way is to wait until we try to send a message.
    return true;
  } catch (error) {
    return false;
  }
}
