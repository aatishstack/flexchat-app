import {
  FastifyInstance,
} from "fastify";

import fs from "fs";

import path from "path";

import { pipeline } from "stream/promises";

import { env } from "../config/env.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const IMAGE_UPLOAD_LIMIT_BYTES =
  10 * 1024 * 1024;
const VIDEO_UPLOAD_LIMIT_BYTES =
  25 * 1024 * 1024;
const AUDIO_UPLOAD_LIMIT_BYTES =
  12 * 1024 * 1024;
const DOCUMENT_UPLOAD_LIMIT_BYTES =
  8 * 1024 * 1024;
const HARD_UPLOAD_LIMIT_BYTES =
  VIDEO_UPLOAD_LIMIT_BYTES;

const allowedMediaTypes = new Map<
  string,
  {
    extensions: readonly string[];
    maxBytes: number;
    kind:
      | "image"
      | "video"
      | "audio"
      | "document";
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
      extensions: [".mp4", ".m4v"],
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

function getAllowedMediaType(
  mimeType: string,
  extension: string
) {
  const mediaType =
    allowedMediaTypes.get(
      mimeType.toLowerCase()
    );

  if (
    !mediaType ||
    !mediaType.extensions.includes(extension)
  ) {
    return null;
  }

  return mediaType;
}

async function removeFileIfExists(filepath: string) {
  await fs.promises
    .unlink(filepath)
    .catch(() => undefined);
}

export async function uploadRoutes(
  app: FastifyInstance
) {
  app.post(
    "/upload",

    {
      onRequest:
        authMiddleware,
    },

    async (
      request,
      reply
    ) => {
      const data =
        await request.file({
          limits: {
            fileSize:
              HARD_UPLOAD_LIMIT_BYTES,
            files: 1,
          },
        });

      if (!data) {
        return reply
          .status(400)
          .send({
            message:
              "No file uploaded",
          });
      }

      const extension =
        path
          .extname(
            path.basename(
              data.filename
            )
          )
          .toLowerCase();

      if (
        !extension ||
        extension.includes("/") ||
        extension.includes("\\")
      ) {
        data.file.destroy();

        return reply
          .status(415)
          .send({
            message:
              "Unsupported file type",
          });
      }

      const mediaType =
        getAllowedMediaType(
          data.mimetype,
          extension
        );

      if (!mediaType) {
        data.file.destroy();

        return reply
          .status(415)
          .send({
            message:
              "Unsupported file type",
          });
      }

      const uploadsDir =
        path.join(
          process.cwd(),
          "uploads"
        );

      await fs.promises.mkdir(
        uploadsDir,
        {
          recursive: true,
        }
      );

      const filename = `${crypto.randomUUID()}${extension}`;

      const filepath =
        path.join(
          uploadsDir,
          filename
        );

      try {
        await pipeline(
          data.file,
          fs.createWriteStream(
            filepath,
            {
              flags: "wx",
            }
          )
        );
      } catch (error) {
        await removeFileIfExists(filepath);
        throw error;
      }

      const uploadStream =
        data.file as typeof data.file & {
          truncated?: boolean;
        };

      if (uploadStream.truncated) {
        await removeFileIfExists(filepath);

        return reply
          .status(413)
          .send({
            message:
              "File is too large",
          });
      }

      const stats =
        await fs.promises.stat(filepath);

      if (stats.size > mediaType.maxBytes) {
        await removeFileIfExists(filepath);

        return reply
          .status(413)
          .send({
            message:
              mediaType.kind === "video"
                ? "Video is too large"
                : mediaType.kind === "image"
                  ? "Image is too large"
                  : "File is too large",
            maxBytes: mediaType.maxBytes,
          });
      }

      return {
        url: `${env.PUBLIC_API_URL}/uploads/${filename}`,
        kind: mediaType.kind,
        size: stats.size,
      };
    }
  );
}
