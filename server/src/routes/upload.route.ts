import {
  FastifyInstance,
} from "fastify";

import fs from "fs";

import path from "path";

import { pipeline } from "stream/promises";

import { env } from "../config/env.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const allowedExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".m4a",
  ".mp3",
  ".mp4",
  ".ogg",
  ".pdf",
  ".png",
  ".wav",
  ".webm",
  ".webp",
]);

function isAllowedMimeType(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("video/") ||
    mimeType === "application/pdf"
  );
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
              MAX_UPLOAD_BYTES,
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
        !allowedExtensions.has(extension) ||
        !isAllowedMimeType(data.mimetype)
      ) {
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

      return {
        url: `${env.PUBLIC_API_URL}/uploads/${filename}`,
      };
    }
  );
}
