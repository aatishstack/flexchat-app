import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import {
  getAuth,
} from "firebase-admin/auth";

import { env } from "../config/env.js";

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function parseServiceAccountJson(
  value: string
) {
  const parsed =
    JSON.parse(value) as {
      project_id?: string;
      projectId?: string;
      client_email?: string;
      clientEmail?: string;
      private_key?: string;
      privateKey?: string;
    };

  return {
    projectId:
      parsed.project_id ??
      parsed.projectId ??
      "",
    clientEmail:
      parsed.client_email ??
      parsed.clientEmail ??
      "",
    privateKey:
      parsed.private_key ??
      parsed.privateKey ??
      "",
  };
}

function getServiceAccount():
  | FirebaseServiceAccount
  | null {
  if (
    env.FIREBASE_SERVICE_ACCOUNT_BASE64
  ) {
    return parseServiceAccountJson(
      Buffer.from(
        env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        "base64"
      ).toString("utf8")
    );
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return parseServiceAccountJson(
      env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
  }

  if (
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId:
        env.FIREBASE_PROJECT_ID,
      clientEmail:
        env.FIREBASE_CLIENT_EMAIL,
      privateKey:
        env.FIREBASE_PRIVATE_KEY.replace(
          /\\n/g,
          "\n"
        ),
    };
  }

  return null;
}

export function getFirebaseAuth() {
  if (!getApps().length) {
    const serviceAccount =
      getServiceAccount();

    if (!serviceAccount) {
      throw new Error(
        "Firebase Admin credentials are not configured"
      );
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return getAuth();
}
