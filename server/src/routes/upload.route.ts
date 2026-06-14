import type { FastifyInstance } from "fastify";

import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  MediaServiceError,
  uploadRequestMedia,
} from "../services/media.service.js";

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
          "Cloudinary upload failed",
        );

        return reply.status(503).send({
          message: "Media upload is temporarily unavailable",
        });
      }
    },
  );
}
