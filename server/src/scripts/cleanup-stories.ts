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
    with removable_stories as (
      select
        id,
        media_public_id,
        media_resource_type
      from stories
      where deleted_at is not null
        or expires_at <= now()
    ),
    deleted_views as (
      delete from story_views
      where story_id in (
        select id from removable_stories
      )
    )
    delete from stories
    where id in (
      select id from removable_stories
    )
    returning
      id,
      media_public_id as "mediaPublicId",
      media_resource_type as "mediaResourceType"
  `);

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
    `Purged ${stories.length} expired or deleted stories. Removed ${removedAssets} media assets; ${failedAssets} remain queued for retry.`,
  );
} finally {
  await closeDb();
}
