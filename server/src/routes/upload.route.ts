import { FastifyInstance } from "fastify";

import fs from "fs";

import path from "path";

import { pipeline } from "stream/promises";

import { env } from "../config/env.js";
import { generateId } from "../lib/uuid.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const IMAGE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const VIDEO_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
const AUDIO_UPLOAD_LIMIT_BYTES = 12 * 1024 * 1024;
const DOCUMENT_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024;
const HARD_UPLOAD_LIMIT_BYTES = VIDEO_UPLOAD_LIMIT_BYTES;

const allowedMediaTypes = new Map<
  string,
  {
    extensions: readonly string[];
    maxBytes: number;
    kind: "image" | "video" | "audio" | "document";
  }
>([
  [
    "image/avif",
    {
      extensions: [".avif"],
      maxBytes: IMAGE_UPLOAD_LIMIT_BYTES,
      kind: "image",
    },
  ],
  [
    "image/gif",
    {
      extensions: [".gif"],
      maxBytes: IMAGE_UPLOAD_LIMIT_BYTES,
      kind: "image",
    },
  ],
  [
    "image/heic",
    {
      extensions: [".heic"],
      maxBytes: IMAGE_UPLOAD_LIMIT_BYTES,
      kind: "image",
    },
  ],
  [
    "image/heif",
    {
      extensions: [".heif"],
      maxBytes: IMAGE_UPLOAD_LIMIT_BYTES,
      kind: "image",
    },
  ],
  [
    "image/jpeg",
    {
      extensions: [".jpg", ".jpeg"],
      maxBytes: IMAGE_UPLOAD_LIMIT_BYTES,
      kind: "image",
    },
  ],
  [
    "image/png",
    {
      extensions: [".png"],
      maxBytes: IMAGE_UPLOAD_LIMIT_BYTES,
      kind: "image",
    },
  ],
  [
    "image/webp",
    {
      extensions: [".webp"],
      maxBytes: IMAGE_UPLOAD_LIMIT_BYTES,
      kind: "image",
    },
  ],
  [
    "video/mp4",
    {
      extensions: [".mp4", ".m4v", ".mov"],
      maxBytes: VIDEO_UPLOAD_LIMIT_BYTES,
      kind: "video",
    },
  ],
  [
    "video/quicktime",
    {
      extensions: [".mov"],
      maxBytes: VIDEO_UPLOAD_LIMIT_BYTES,
      kind: "video",
    },
  ],
  [
    "video/x-m4v",
    {
      extensions: [".m4v"],
      maxBytes: VIDEO_UPLOAD_LIMIT_BYTES,
      kind: "video",
    },
  ],
  [
    "video/3gpp",
    {
      extensions: [".3gp", ".3gpp"],
      maxBytes: VIDEO_UPLOAD_LIMIT_BYTES,
      kind: "video",
    },
  ],
  [
    "video/3gpp2",
    {
      extensions: [".3g2", ".3gpp2"],
      maxBytes: VIDEO_UPLOAD_LIMIT_BYTES,
      kind: "video",
    },
  ],
  [
    "video/webm",
    {
      extensions: [".webm"],
      maxBytes: VIDEO_UPLOAD_LIMIT_BYTES,
      kind: "video",
    },
  ],
  [
    "audio/mpeg",
    {
      extensions: [".mp3"],
      maxBytes: AUDIO_UPLOAD_LIMIT_BYTES,
      kind: "audio",
    },
  ],
  [
    "audio/mp4",
    {
      extensions: [".m4a"],
      maxBytes: AUDIO_UPLOAD_LIMIT_BYTES,
      kind: "audio",
    },
  ],
  [
    "audio/ogg",
    {
      extensions: [".ogg"],
      maxBytes: AUDIO_UPLOAD_LIMIT_BYTES,
      kind: "audio",
    },
  ],
  [
    "audio/webm",
    {
      extensions: [".webm"],
      maxBytes: AUDIO_UPLOAD_LIMIT_BYTES,
      kind: "audio",
    },
  ],
  [
    "audio/wav",
    {
      extensions: [".wav"],
      maxBytes: AUDIO_UPLOAD_LIMIT_BYTES,
      kind: "audio",
    },
  ],
  [
    "application/pdf",
    {
      extensions: [".pdf"],
      maxBytes: DOCUMENT_UPLOAD_LIMIT_BYTES,
      kind: "document",
    },
  ],
]);

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

function normalizeMimeType(mimeType: string) {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

async function removeFileIfExists(filepath: string) {
  await fs.promises.unlink(filepath).catch(() => undefined);
}

async function readFileHeader(filepath: string, length = 4100) {
  const fileHandle = await fs.promises.open(filepath, "r");

  try {
    const buffer = Buffer.alloc(length);
    const result = await fileHandle.read(buffer, 0, length, 0);

    return buffer.subarray(0, result.bytesRead);
  } finally {
    await fileHandle.close();
  }
}

function hasAsciiAt(buffer: Buffer, offset: number, value: string) {
  return (
    buffer.length >= offset + value.length &&
    buffer.subarray(offset, offset + value.length).toString("ascii") === value
  );
}

function hasOneOfAsciiAt(buffer: Buffer, offset: number, values: string[]) {
  return values.some((value) => hasAsciiAt(buffer, offset, value));
}

function hasMp3FrameSync(buffer: Buffer) {
  return buffer.length > 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

function hasMp4FamilyBrand(buffer: Buffer) {
  if (!hasAsciiAt(buffer, 4, "ftyp")) {
    return false;
  }

  const brandWindow = buffer
    .subarray(8, Math.min(buffer.length, 64))
    .toString("ascii");

  return [
    "avif",
    "isom",
    "iso2",
    "mp41",
    "mp42",
    "m4v",
    "M4V",
    "M4A",
    "qt  ",
    "3gp",
  ].some((brand) => brandWindow.includes(brand));
}

function hasHeifFamilyBrand(buffer: Buffer) {
  if (!hasAsciiAt(buffer, 4, "ftyp")) {
    return false;
  }

  const brandWindow = buffer
    .subarray(8, Math.min(buffer.length, 64))
    .toString("ascii");

  return ["heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1"].some(
    (brand) => brandWindow.includes(brand),
  );
}

function isFileSignatureAllowed(mimeType: string, header: Buffer) {
  switch (mimeType.toLowerCase()) {
    case "image/avif":
      return (
        hasAsciiAt(header, 4, "ftyp") &&
        header
          .subarray(8, Math.min(header.length, 32))
          .toString("ascii")
          .includes("avif")
      );
    case "image/heic":
    case "image/heif":
      return hasHeifFamilyBrand(header);
    case "image/gif":
      return hasAsciiAt(header, 0, "GIF87a") || hasAsciiAt(header, 0, "GIF89a");
    case "image/jpeg":
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    case "image/png":
      return (
        header.length >= 8 &&
        header[0] === 0x89 &&
        hasAsciiAt(header, 1, "PNG\r\n\u001a\n")
      );
    case "image/webp":
      return hasAsciiAt(header, 0, "RIFF") && hasAsciiAt(header, 8, "WEBP");
    case "video/mp4":
    case "video/x-m4v":
    case "video/quicktime":
    case "video/3gpp":
    case "video/3gpp2":
      return hasMp4FamilyBrand(header);
    case "video/webm":
    case "audio/webm":
      return (
        header[0] === 0x1a &&
        header[1] === 0x45 &&
        header[2] === 0xdf &&
        header[3] === 0xa3
      );
    case "audio/mpeg":
      return hasAsciiAt(header, 0, "ID3") || hasMp3FrameSync(header);
    case "audio/mp4":
      return hasMp4FamilyBrand(header);
    case "audio/ogg":
      return hasAsciiAt(header, 0, "OggS");
    case "audio/wav":
      return (
        hasAsciiAt(header, 0, "RIFF") &&
        hasOneOfAsciiAt(header, 8, ["WAVE", "WAVEfmt"])
      );
    case "application/pdf":
      return hasAsciiAt(header, 0, "%PDF-");
    default:
      return false;
  }
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post(
    "/upload",

    {
      onRequest: authMiddleware,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },

    async (request, reply) => {
      const data = await request.file({
        limits: {
          fileSize: HARD_UPLOAD_LIMIT_BYTES,
          files: 1,
        },
      });

      if (!data) {
        return reply.status(400).send({
          message: "No file uploaded",
        });
      }

      const extension = path
        .extname(path.basename(data.filename))
        .toLowerCase();

      if (extension.includes("/") || extension.includes("\\")) {
        data.file.destroy();

        return reply.status(415).send({
          message: "Unsupported file type",
        });
      }

      const normalizedMimeType = normalizeMimeType(data.mimetype);
      const mediaType = getAllowedMediaType(normalizedMimeType, extension);

      if (!mediaType) {
        data.file.destroy();

        return reply.status(415).send({
          message: "Unsupported file type",
        });
      }
      const normalizedExtension = extension || mediaType.extensions[0];

      const uploadsDir = path.join(process.cwd(), "uploads");

      await fs.promises.mkdir(uploadsDir, {
        recursive: true,
      });

      const filename = `${generateId()}${normalizedExtension}`;

      const filepath = path.join(uploadsDir, filename);

      try {
        await pipeline(
          data.file,
          fs.createWriteStream(filepath, {
            flags: "wx",
          }),
        );
      } catch (error) {
        await removeFileIfExists(filepath);
        throw error;
      }

      const uploadStream = data.file as typeof data.file & {
        truncated?: boolean;
      };

      if (uploadStream.truncated) {
        await removeFileIfExists(filepath);

        return reply.status(413).send({
          message: "File is too large",
        });
      }

      const stats = await fs.promises.stat(filepath);

      if (stats.size > mediaType.maxBytes) {
        await removeFileIfExists(filepath);

        return reply.status(413).send({
          message:
            mediaType.kind === "video"
              ? "Video is too large"
              : mediaType.kind === "image"
                ? "Image is too large"
                : "File is too large",
          maxBytes: mediaType.maxBytes,
        });
      }

      const header = await readFileHeader(filepath);

      if (!isFileSignatureAllowed(mediaType.mimeType, header)) {
        await removeFileIfExists(filepath);

        return reply.status(415).send({
          message: "File contents do not match the selected media type",
        });
      }

      return {
        url: `${env.PUBLIC_API_URL}/uploads/${filename}`,
        kind: mediaType.kind,
        size: stats.size,
      };
    },
  );
}
