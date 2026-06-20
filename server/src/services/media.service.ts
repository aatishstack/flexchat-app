import { createWriteStream } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";

import type { FastifyRequest } from "fastify";
import { sql } from "drizzle-orm";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { getCloudinary } from "../lib/cloudinary.js";
import {
  buildR2Key,
  deleteR2Object,
  getR2DownloadUrl,
  isR2PersistentStorageReady,
  isR2Key,
  putR2Object,
} from "../lib/r2.js";
import {
  isFileSignatureAllowed,
  readFileHeader,
} from "../lib/upload-signature.js";
import { generateId } from "../lib/uuid.js";

export type MediaPurpose =
  | "avatar"
  | "group_avatar"
  | "story"
  | "chat"
  | "voice"
  | "attachment";

export type MediaKind =
  | "image"
  | "video"
  | "audio"
  | "document";

export type MediaResourceType =
  | "image"
  | "video"
  | "raw";

export type StoredMediaAsset = {
  publicId: string;
  ownerUserId: string;
  purpose: MediaPurpose;
  secureUrl: string;
  deliveryUrl: string;
  resourceType: MediaResourceType;
  kind: MediaKind;
  mimeType: string;
  fileName: string;
  bytes: number;
  format: string | null;
};

type AllowedMediaType = {
  extensions: readonly string[];
  maxBytes: number;
  kind: MediaKind;
};

const IMAGE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const VIDEO_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
const AUDIO_UPLOAD_LIMIT_BYTES = 12 * 1024 * 1024;
const DOCUMENT_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024;
const HARD_UPLOAD_LIMIT_BYTES = VIDEO_UPLOAD_LIMIT_BYTES;

const allowedMediaTypes = new Map<string, AllowedMediaType>([
  ["image/avif", { extensions: [".avif"], maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, kind: "image" }],
  ["image/gif", { extensions: [".gif"], maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, kind: "image" }],
  ["image/heic", { extensions: [".heic"], maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, kind: "image" }],
  ["image/heif", { extensions: [".heif"], maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, kind: "image" }],
  ["image/jpeg", { extensions: [".jpg", ".jpeg"], maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, kind: "image" }],
  ["image/png", { extensions: [".png"], maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, kind: "image" }],
  ["image/webp", { extensions: [".webp"], maxBytes: IMAGE_UPLOAD_LIMIT_BYTES, kind: "image" }],
  ["video/mp4", { extensions: [".mp4", ".m4v", ".mov"], maxBytes: VIDEO_UPLOAD_LIMIT_BYTES, kind: "video" }],
  ["video/quicktime", { extensions: [".mov"], maxBytes: VIDEO_UPLOAD_LIMIT_BYTES, kind: "video" }],
  ["video/x-m4v", { extensions: [".m4v"], maxBytes: VIDEO_UPLOAD_LIMIT_BYTES, kind: "video" }],
  ["video/3gpp", { extensions: [".3gp", ".3gpp"], maxBytes: VIDEO_UPLOAD_LIMIT_BYTES, kind: "video" }],
  ["video/3gpp2", { extensions: [".3g2", ".3gpp2"], maxBytes: VIDEO_UPLOAD_LIMIT_BYTES, kind: "video" }],
  ["video/webm", { extensions: [".webm"], maxBytes: VIDEO_UPLOAD_LIMIT_BYTES, kind: "video" }],
  ["audio/mpeg", { extensions: [".mp3"], maxBytes: AUDIO_UPLOAD_LIMIT_BYTES, kind: "audio" }],
  ["audio/mp4", { extensions: [".m4a"], maxBytes: AUDIO_UPLOAD_LIMIT_BYTES, kind: "audio" }],
  ["audio/ogg", { extensions: [".ogg"], maxBytes: AUDIO_UPLOAD_LIMIT_BYTES, kind: "audio" }],
  ["audio/webm", { extensions: [".webm"], maxBytes: AUDIO_UPLOAD_LIMIT_BYTES, kind: "audio" }],
  ["audio/wav", { extensions: [".wav"], maxBytes: AUDIO_UPLOAD_LIMIT_BYTES, kind: "audio" }],
  ["application/pdf", { extensions: [".pdf"], maxBytes: DOCUMENT_UPLOAD_LIMIT_BYTES, kind: "document" }],
]);

const purposeKinds: Record<MediaPurpose, readonly MediaKind[]> = {
  avatar: ["image"],
  group_avatar: ["image"],
  story: ["image", "video"],
  chat: ["image", "video", "audio", "document"],
  voice: ["audio"],
  attachment: ["image", "video", "audio", "document"],
};

const mediaPurposes = new Set<MediaPurpose>(
  Object.keys(purposeKinds) as MediaPurpose[],
);

export class MediaServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

function normalizeMimeType(mimeType: string) {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function getAllowedMediaType(mimeType: string, extension: string) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const mediaType = allowedMediaTypes.get(normalizedMimeType);

  if (
    mediaType &&
    (!extension || mediaType.extensions.includes(extension))
  ) {
    return {
      ...mediaType,
      mimeType: normalizedMimeType,
    };
  }

  for (const [fallbackMimeType, fallbackMediaType] of allowedMediaTypes) {
    if (extension && fallbackMediaType.extensions.includes(extension)) {
      return {
        ...fallbackMediaType,
        mimeType: fallbackMimeType,
      };
    }
  }

  return null;
}

function readMultipartField(
  fields: Record<string, unknown>,
  key: string,
) {
  const field = fields[key];

  if (!field || typeof field !== "object" || !("value" in field)) {
    return undefined;
  }

  const value = (field as { value?: unknown }).value;

  return typeof value === "string" ? value : undefined;
}

function getMultipartTextFields(fields: Record<string, unknown>) {
  return Object.fromEntries(
    Object.keys(fields).flatMap((key) => {
      const value = readMultipartField(fields, key);

      return value === undefined ? [] : [[key, value]];
    }),
  );
}

function parsePurpose(value?: string): MediaPurpose {
  const purpose = value?.trim() as MediaPurpose | undefined;

  if (!purpose || !mediaPurposes.has(purpose)) {
    throw new MediaServiceError("Invalid media upload purpose");
  }

  return purpose;
}

function getResourceType(kind: MediaKind): MediaResourceType {
  if (kind === "image") {
    return "image";
  }

  if (kind === "document") {
    return "raw";
  }

  return "video";
}

function safeFolderSegment(value: string) {
  const segment = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);

  if (!segment) {
    throw new MediaServiceError("Invalid media owner");
  }

  return segment;
}

function buildDeliveryUrl(
  secureUrl: string,
  kind: MediaKind,
) {
  if (kind !== "image" && kind !== "video") {
    return secureUrl;
  }

  return secureUrl.replace(
    "/upload/",
    "/upload/f_auto,q_auto/",
  );
}

async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: MediaResourceType,
) {
  const result = await getCloudinary().uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary deletion failed: ${result.result}`);
  }
}

function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Provider-aware asset deletion. R2-backed assets are identified by their key
 * prefix; everything else is treated as a Cloudinary public id. This lets R2
 * and Cloudinary assets coexist (e.g. historical media) without schema changes.
 */
async function destroyStoredAsset(
  publicId: string,
  resourceType: MediaResourceType,
) {
  if (isR2Key(publicId)) {
    await deleteR2Object(publicId);
    return;
  }

  await destroyCloudinaryAsset(publicId, resourceType);
}

type StoredUploadResult = {
  publicId: string;
  secureUrl: string;
  deliveryUrl: string;
  bytes: number;
  format: string | null;
};

/**
 * Persist an uploaded temp file to object storage.
 *
 * Prefers Cloudflare R2 when configured (profile photos, story media, image /
 * video / document / attachment uploads), and falls back to Cloudinary when R2
 * is unavailable or a transient R2 error occurs. When R2 is not configured at
 * all, Cloudinary remains the default exactly as before.
 */
async function storeUploadedFile(input: {
  tempFilepath: string;
  ownerUserId: string;
  purpose: MediaPurpose;
  kind: MediaKind;
  mimeType: string;
  normalizedExtension: string;
  resourceType: MediaResourceType;
  fallbackBytes: number;
}): Promise<StoredUploadResult> {
  if (isR2PersistentStorageReady()) {
    try {
      const body = await fs.readFile(input.tempFilepath);
      const key = buildR2Key([
        safeFolderSegment(input.ownerUserId),
        input.purpose,
        `${generateId()}${input.normalizedExtension}`,
      ]);

      await putR2Object({
        key,
        body,
        contentType: input.mimeType,
      });

      const url = await getR2DownloadUrl({ key });

      return {
        publicId: key,
        secureUrl: url,
        deliveryUrl: url,
        bytes: body.byteLength || input.fallbackBytes,
        format:
          input.normalizedExtension.replace(/^\./, "").toLowerCase() || null,
      };
    } catch (error) {
      if (!isCloudinaryConfigured()) {
        throw error;
      }

      console.error(
        "[R2] upload failed; falling back to Cloudinary",
        {
          message: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  const cloudinary = getCloudinary();
  const uploadResult = await cloudinary.uploader.upload(input.tempFilepath, {
    resource_type: input.resourceType,
    folder: `flexchat/${safeFolderSegment(input.ownerUserId)}/${input.purpose}`,
    public_id: generateId(),
    overwrite: false,
    unique_filename: false,
    use_filename: false,
    tags: ["flexchat", input.purpose],
    context: {
      owner_id: input.ownerUserId,
      purpose: input.purpose,
    },
  });

  return {
    publicId: uploadResult.public_id,
    secureUrl: uploadResult.secure_url,
    deliveryUrl: buildDeliveryUrl(uploadResult.secure_url, input.kind),
    bytes: uploadResult.bytes || input.fallbackBytes,
    format: uploadResult.format ?? null,
  };
}

async function recordMediaAsset(
  asset: StoredMediaAsset,
  clientUploadId: string,
) {
  await db.execute(sql`
    insert into media_assets (
      public_id,
      owner_user_id,
      client_upload_id,
      purpose,
      secure_url,
      delivery_url,
      resource_type,
      kind,
      mime_type,
      file_name,
      bytes,
      format
    )
    values (
      ${asset.publicId},
      ${asset.ownerUserId},
      ${clientUploadId},
      ${asset.purpose},
      ${asset.secureUrl},
      ${asset.deliveryUrl},
      ${asset.resourceType},
      ${asset.kind},
      ${asset.mimeType},
      ${asset.fileName},
      ${asset.bytes},
      ${asset.format}
    )
  `);
}

async function getExistingUpload(
  ownerUserId: string,
  clientUploadId: string,
) {
  const assets = await db.execute<StoredMediaAsset>(sql`
    select
      public_id as "publicId",
      owner_user_id as "ownerUserId",
      purpose,
      secure_url as "secureUrl",
      delivery_url as "deliveryUrl",
      resource_type as "resourceType",
      kind,
      mime_type as "mimeType",
      file_name as "fileName",
      bytes,
      format
    from media_assets
    where owner_user_id = ${ownerUserId}
      and client_upload_id = ${clientUploadId}
      and delete_requested_at is null
      and deleted_at is null
    limit 1
  `);

  return assets[0] ?? null;
}

export async function uploadRequestMedia(
  request: FastifyRequest,
  ownerUserId: string,
  forcedPurpose?: MediaPurpose,
) {
  const data = await request.file({
    limits: {
      fileSize: HARD_UPLOAD_LIMIT_BYTES,
      files: 1,
    },
  });

  if (!data) {
    throw new MediaServiceError("No file uploaded");
  }

  const extension = path
    .extname(path.basename(data.filename))
    .toLowerCase();
  const mediaType = getAllowedMediaType(data.mimetype, extension);

  if (!mediaType) {
    data.file.destroy();
    throw new MediaServiceError("Unsupported file type", 415);
  }

  const purpose =
    forcedPurpose ??
    parsePurpose(
      readMultipartField(
        data.fields as Record<string, unknown>,
        "purpose",
      ) ?? "chat",
    );
  const clientUploadId =
    readMultipartField(
      data.fields as Record<string, unknown>,
      "uploadId",
    )?.trim() || generateId();

  if (
    !clientUploadId ||
    clientUploadId.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(clientUploadId)
  ) {
    data.file.destroy();
    throw new MediaServiceError("Invalid upload identifier");
  }

  if (!purposeKinds[purpose].includes(mediaType.kind)) {
    data.file.destroy();
    throw new MediaServiceError(
      purpose === "story"
        ? "Choose an image or video story."
        : "This file type is not allowed for that upload",
      415,
    );
  }

  const existingUpload = await getExistingUpload(
    ownerUserId,
    clientUploadId,
  );

  if (existingUpload) {
    data.file.destroy();

    if (
      existingUpload.purpose !== purpose ||
      !purposeKinds[purpose].includes(existingUpload.kind)
    ) {
      throw new MediaServiceError(
        "Upload identifier was already used for different media",
        409,
      );
    }

    return {
      ...existingUpload,
      fields: getMultipartTextFields(
        data.fields as Record<string, unknown>,
      ),
    };
  }

  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "flexchat-media-"),
  );
  const normalizedExtension = extension || mediaType.extensions[0];
  const tempFilepath = path.join(
    tempDirectory,
    `${generateId()}${normalizedExtension}`,
  );

  try {
    await pipeline(
      data.file,
      createWriteStream(tempFilepath, {
        flags: "wx",
      }),
    );

    if (
      "truncated" in data.file &&
      data.file.truncated
    ) {
      throw new MediaServiceError("File is too large", 413);
    }

    const stats = await fs.stat(tempFilepath);

    if (stats.size > mediaType.maxBytes) {
      throw new MediaServiceError(
        `${mediaType.kind[0].toUpperCase()}${mediaType.kind.slice(
          1,
        )} uploads must be ${Math.round(
          mediaType.maxBytes / 1024 / 1024,
        )} MB or smaller.`,
        413,
      );
    }

    const header = await readFileHeader(tempFilepath);

    if (!isFileSignatureAllowed(mediaType.mimeType, header)) {
      throw new MediaServiceError(
        "File contents do not match the selected media type",
        415,
      );
    }

    const resourceType = getResourceType(mediaType.kind);
    const stored = await storeUploadedFile({
      tempFilepath,
      ownerUserId,
      purpose,
      kind: mediaType.kind,
      mimeType: mediaType.mimeType,
      normalizedExtension,
      resourceType,
      fallbackBytes: stats.size,
    });
    const asset: StoredMediaAsset = {
      publicId: stored.publicId,
      ownerUserId,
      purpose,
      secureUrl: stored.secureUrl,
      deliveryUrl: stored.deliveryUrl,
      resourceType,
      kind: mediaType.kind,
      mimeType: mediaType.mimeType,
      fileName: path.basename(data.filename).slice(0, 255),
      bytes: stored.bytes,
      format: stored.format,
    };

    try {
      await recordMediaAsset(asset, clientUploadId);
    } catch (error) {
      const existingAsset = await getExistingUpload(
        ownerUserId,
        clientUploadId,
      );

      await destroyStoredAsset(
        asset.publicId,
        asset.resourceType,
      ).catch(() => undefined);

      if (
        existingAsset &&
        existingAsset.purpose === purpose
      ) {
        return {
          ...existingAsset,
          fields: getMultipartTextFields(
            data.fields as Record<string, unknown>,
          ),
        };
      }

      throw error;
    }

    return {
      ...asset,
      fields: getMultipartTextFields(
        data.fields as Record<string, unknown>,
      ),
    };
  } finally {
    await fs.rm(tempDirectory, {
      recursive: true,
      force: true,
    });
  }
}

export async function claimOwnedMediaAsset(
  ownerUserId: string,
  publicId: string,
  purposes: readonly MediaPurpose[],
) {
  const assets = await db.execute<StoredMediaAsset>(sql`
    update media_assets
    set attached_at = now()
    where public_id = ${publicId}
      and owner_user_id = ${ownerUserId}
      and purpose in (${sql.join(
        purposes.map((purpose) => sql`${purpose}`),
        sql`, `,
      )})
      and attached_at is null
      and delete_requested_at is null
      and deleted_at is null
    returning
      public_id as "publicId",
      owner_user_id as "ownerUserId",
      purpose,
      secure_url as "secureUrl",
      delivery_url as "deliveryUrl",
      resource_type as "resourceType",
      kind,
      mime_type as "mimeType",
      file_name as "fileName",
      bytes,
      format
  `);

  const asset = assets[0];

  if (!asset) {
    throw new MediaServiceError(
      "Media is unavailable or does not belong to this account",
      403,
    );
  }

  return asset;
}

export async function releaseClaimedMediaAsset(publicId: string) {
  await db.execute(sql`
    update media_assets
    set attached_at = null
    where public_id = ${publicId}
      and delete_requested_at is null
      and deleted_at is null
  `);
}

export async function deleteMediaAsset(
  publicId?: string | null,
  resourceType?: string | null,
) {
  if (
    !publicId ||
    !["image", "video", "raw"].includes(resourceType ?? "")
  ) {
    return;
  }

  const normalizedResourceType =
    resourceType as MediaResourceType;

  await db.execute(sql`
    update media_assets
    set
      attached_at = null,
      delete_requested_at = now()
    where public_id = ${publicId}
      and deleted_at is null
  `);

  await destroyStoredAsset(
    publicId,
    normalizedResourceType,
  );

  await db.execute(sql`
    update media_assets
    set deleted_at = now()
    where public_id = ${publicId}
      and deleted_at is null
  `);
}

async function cleanupPendingMediaAssets() {
  const assets = await db.execute<{
    publicId: string;
    resourceType: MediaResourceType;
  }>(sql`
    select
      public_id as "publicId",
      resource_type as "resourceType"
    from media_assets
    where deleted_at is null
      and (
        delete_requested_at is not null
        or (
          attached_at is null
          and created_at <
            now() - (${env.UPLOAD_RETENTION_HOURS} * interval '1 hour')
        )
      )
    order by
      delete_requested_at asc nulls last,
      created_at asc
    limit 100
  `);

  let removedAssets = 0;

  for (const asset of assets) {
    try {
      await destroyStoredAsset(
        asset.publicId,
        asset.resourceType,
      );
      await db.execute(sql`
        update media_assets
        set deleted_at = now()
        where public_id = ${asset.publicId}
          and deleted_at is null
      `);
      removedAssets += 1;
    } catch (error) {
      console.error("Failed to clean media asset", {
        publicId: asset.publicId,
        error,
      });
    }
  }

  return removedAssets;
}

export function startMediaCleanup() {
  const runCleanup = () => {
    void cleanupPendingMediaAssets()
      .then((removedAssets) => {
        if (removedAssets) {
          console.info("Removed orphaned Cloudinary media", {
            removedAssets,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to clean Cloudinary media", error);
      });
  };
  const timer = setInterval(
    runCleanup,
    env.UPLOAD_CLEANUP_INTERVAL_MINUTES * 60 * 1000,
  );

  timer.unref?.();
  runCleanup();

  return timer;
}
