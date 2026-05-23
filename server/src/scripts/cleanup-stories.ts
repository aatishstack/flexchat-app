import "dotenv/config";

import fs from "fs/promises";
import path from "path";

import { sql } from "drizzle-orm";

import { env } from "../config/env.js";
import {
  closeDb,
  db,
} from "../db/index.js";

function getUploadedFilePath(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const publicApiUrl = new URL(env.PUBLIC_API_URL);

    if (
      parsedUrl.origin !== publicApiUrl.origin ||
      !parsedUrl.pathname.startsWith("/uploads/")
    ) {
      return null;
    }

    const filename = path.basename(parsedUrl.pathname);

    if (!filename || filename === "uploads") {
      return null;
    }

    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const filepath = path.resolve(uploadsDir, filename);

    if (!filepath.startsWith(`${uploadsDir}${path.sep}`)) {
      return null;
    }

    return filepath;
  } catch {
    return null;
  }
}

try {
  const stories = await db.execute<{
    id: string;
    mediaUrl: string | null;
  }>(sql`
    select
      id,
      media_url as "mediaUrl"
    from stories
  `);

  const mediaFiles = Array.from(
    new Set(
      stories
        .map((story) => getUploadedFilePath(story.mediaUrl))
        .filter((filepath): filepath is string => Boolean(filepath)),
    ),
  );

  await db.execute(sql`delete from story_views`);
  await db.execute(sql`delete from stories`);

  let removedFiles = 0;

  for (const filepath of mediaFiles) {
    await fs.unlink(filepath)
      .then(() => {
        removedFiles += 1;
      })
      .catch(() => undefined);
  }

  console.log(
    `Deleted ${stories.length} stories, cleared story views, removed ${removedFiles} media files.`,
  );
} finally {
  await closeDb();
}
