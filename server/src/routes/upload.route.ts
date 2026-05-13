import {
  FastifyInstance,
} from "fastify";

import fs from "fs";

import path from "path";

import { pipeline } from "stream/promises";

export async function uploadRoutes(
  app: FastifyInstance
) {
  app.post(
    "/upload",

    async (
      request,
      reply
    ) => {
      const data =
        await request.file();

      if (!data) {
        return reply
          .status(400)
          .send({
            message:
              "No file uploaded",
          });
      }

      const uploadsDir =
        path.join(
          process.cwd(),
          "uploads"
        );

      if (
        !fs.existsSync(
          uploadsDir
        )
      ) {
        fs.mkdirSync(
          uploadsDir
        );
      }

      const filename = `${Date.now()}-${data.filename}`;

      const filepath =
        path.join(
          uploadsDir,
          filename
        );

      await pipeline(
        data.file,
        fs.createWriteStream(
          filepath
        )
      );

      return {
        url: `http://localhost:5000/uploads/${filename}`,
      };
    }
  );
}