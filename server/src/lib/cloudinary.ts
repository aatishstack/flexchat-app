import { v2 as cloudinary } from "cloudinary";

import { env } from "../config/env.js";

let configured = false;

export function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

export function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

export async function verifyCloudinaryConnection() {
  if (!isCloudinaryConfigured()) {
    return { ok: false, message: "Cloudinary credentials not configured" };
  }

  try {
    const api = getCloudinary().api;
    await api.ping();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Cloudinary ping failed",
    };
  }
}
