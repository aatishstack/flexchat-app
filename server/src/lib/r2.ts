import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env.js";

/**
 * Cloudflare R2 storage abstraction.
 *
 * R2 is S3-compatible, so we use the AWS S3 v3 client pointed at the R2
 * endpoint. This module is OPTIONAL and additive: when the R2_* environment
 * variables are not fully configured, `isR2Enabled()` returns false and the
 * media pipeline transparently falls back to Cloudinary. Nothing here changes
 * the existing API or DB contracts.
 *
 * Object keys created by this app are namespaced with `R2_KEY_PREFIX` so the
 * media service can tell R2-backed assets apart from Cloudinary public ids
 * (which begin with "flexchat/") when deleting or cleaning up.
 */

export const R2_KEY_PREFIX = "flexchat-r2/";

const SIGNED_UPLOAD_TTL_SECONDS = 60 * 5; // 5 minutes to start an upload
const SIGNED_DOWNLOAD_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days (S3 SigV4 max)

let client: S3Client | null = null;

export function isR2Enabled(): boolean {
  return Boolean(
    env.R2_BUCKET_NAME &&
      env.R2_ENDPOINT &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY,
  );
}

export function isR2Key(key: string | null | undefined): boolean {
  return Boolean(key && key.startsWith(R2_KEY_PREFIX));
}

function getClient(): S3Client {
  if (client) {
    return client;
  }

  if (!isR2Enabled()) {
    throw new Error("R2 is not configured");
  }

  client = new S3Client({
    // R2 ignores region but the SDK requires a value.
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
    },
  });

  return client;
}

function getBucket(): string {
  if (!env.R2_BUCKET_NAME) {
    throw new Error("R2 bucket is not configured");
  }

  return env.R2_BUCKET_NAME;
}

/** Build a namespaced object key for a stored asset. */
export function buildR2Key(segments: string[]): string {
  const safe = segments
    .map((segment) =>
      segment.replace(/[^a-zA-Z0-9._/-]/g, "").replace(/^\/+|\/+$/g, ""),
    )
    .filter(Boolean)
    .join("/");

  return `${R2_KEY_PREFIX}${safe}`;
}

/** Upload a buffer directly from the server (used by the multipart flow). */
export async function putR2Object(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const s3 = getClient();

  await s3.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
}

/** Presigned PUT URL for direct browser/device uploads to R2. */
export async function getR2UploadUrl(input: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const s3 = getClient();

  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: input.key,
      ContentType: input.contentType,
    }),
    { expiresIn: input.expiresInSeconds ?? SIGNED_UPLOAD_TTL_SECONDS },
  );
}

/**
 * Resolve a readable URL for an R2 object.
 *  - If a public base URL is configured, return the stable public URL.
 *  - Otherwise return a time-limited signed GET URL.
 */
export async function getR2DownloadUrl(input: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  if (env.R2_PUBLIC_BASE_URL) {
    return `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/g, "")}/${input.key}`;
  }

  const s3 = getClient();

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: input.key,
    }),
    {
      expiresIn: input.expiresInSeconds ?? SIGNED_DOWNLOAD_TTL_SECONDS,
    },
  );
}

/** Best-effort stable URL when a public base URL is configured. */
export function getR2PublicUrl(key: string): string | null {
  if (!env.R2_PUBLIC_BASE_URL) {
    return null;
  }

  return `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/g, "")}/${key}`;
}

export async function deleteR2Object(key: string): Promise<void> {
  const s3 = getClient();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}
