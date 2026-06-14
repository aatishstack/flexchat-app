import "dotenv/config";

import { sql } from "drizzle-orm";

import {
  closeDb,
  db,
} from "../db/index.js";
import { deleteMediaAsset } from "../services/media.service.js";

try {
  const stories = await db.execute<{
    id: string;
    mediaPublicId: string | null;
    mediaResourceType: string | null;
  }>(sql`
    select
      id,
      media_public_id as "mediaPublicId",
      media_resource_type as "mediaResourceType"
    from stories
  `);

  await db.execute(sql`delete from story_views`);
  await db.execute(sql`delete from stories`);

  const deletionResults = await Promise.allSettled(
    stories.map((story) =>
      deleteMediaAsset(
        story.mediaPublicId,
        story.mediaResourceType,
      ),
    ),
  );
  const removedAssets = deletionResults.filter(
    (result) => result.status === "fulfilled",
  ).length;
  const failedAssets = deletionResults.length - removedAssets;

  console.log(
    `Deleted ${stories.length} stories and cleared story views. Removed ${removedAssets} media assets; ${failedAssets} remain queued for retry.`,
  );
} finally {
  await closeDb();
}
