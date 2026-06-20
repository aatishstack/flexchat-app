import type { FastifyInstance } from "fastify";

import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  MediaServiceError,
  uploadRequestMedia,
} from "../services/media.service.js";
import {
  buildR2Key,
  getR2DownloadUrl,
  getR2UploadUrl,
  isR2Enabled,
  isR2Key,
} from "../lib/r2.js";
import { generateId } from "../lib/uuid.js";

const PRESIGN_ALLOWED_PURPOSES = new Set([
  "avatar",
  "group_avatar",
  "story",
  "chat",
  "voice",
  "attachment",
]);

const PRESIGN_ALLOWED_CONTENT_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/3gpp",
  "video/3gpp2",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/wav",
  "application/pdf",
]);

function getUserId(request: { user?: unknown }) {
  return (request.user as { id?: string } | undefined)?.id;
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
      const userId = (
        request.user as {
          id?: string;
        } | undefined
      )?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      try {
        const asset = await uploadRequestMedia(request, userId);

        return {
          url: asset.deliveryUrl,
          secureUrl: asset.secureUrl,
          publicId: asset.publicId,
          resourceType: asset.resourceType,
          kind: asset.kind,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          size: asset.bytes,
          format: asset.format,
        };
      } catch (error) {
        if (error instanceof MediaServiceError) {
          return reply.status(error.statusCode).send({
            message: error.message,
          });
        }

        request.log.error(
          {
            err: error,
            userId,
          },
          "Media upload failed",
        );

        return reply.status(503).send({
          message: "Media upload is temporarily unavailable",
        });
      }
    },
  );

  // --- Additive Cloudflare R2 direct-upload flow ---------------------------
  // These endpoints are only active when R2 is configured. They do NOT replace
  // the validated multipart /upload above, which remains the primary path.

  app.post(
    "/upload/r2/presign",
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
      const userId = getUserId(request);

      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      if (!isR2Enabled()) {
        return reply.status(503).send({
          message: "Direct uploads are not available",
        });
      }

      const body = (request.body ?? {}) as {
        purpose?: string;
        contentType?: string;
        fileName?: string;
      };
      const purpose = body.purpose?.trim() ?? "chat";
      const contentType = body.contentType?.trim().toLowerCase() ?? "";

      if (!PRESIGN_ALLOWED_PURPOSES.has(purpose)) {
        return reply.status(400).send({ message: "Invalid upload purpose" });
      }

      if (!PRESIGN_ALLOWED_CONTENT_TYPES.has(contentType)) {
        return reply.status(415).send({ message: "Unsupported content type" });
      }

      try {
        const key = buildR2Key([userId, purpose, generateId()]);
        const uploadUrl = await getR2UploadUrl({ key, contentType });

        return {
          key,
          uploadUrl,
          method: "PUT",
          contentType,
        };
      } catch (error) {
        request.log.error({ err: error, userId }, "R2 presign failed");
        return reply.status(503).send({
          message: "Direct uploads are temporarily unavailable",
        });
      }
    },
  );

  app.get(
    "/upload/r2/download",
    {
      onRequest: authMiddleware,
    },
    async (request, reply) => {
      const userId = getUserId(request);

      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      if (!isR2Enabled()) {
        return reply.status(503).send({
          message: "Signed downloads are not available",
        });
      }

      const key = (request.query as { key?: string } | undefined)?.key?.trim();

      if (!key || !isR2Key(key)) {
        return reply.status(400).send({ message: "Invalid object key" });
      }

      try {
        const url = await getR2DownloadUrl({ key });
        return { url };
      } catch (error) {
        request.log.error({ err: error, userId }, "R2 download sign failed");
        return reply.status(503).send({
          message: "Signed downloads are temporarily unavailable",
        });
      }
    },
  );
}
