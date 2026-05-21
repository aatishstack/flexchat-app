import { sql } from "drizzle-orm";

import {
  closeDb,
  db,
} from "../db/index.js";

await db.execute(sql`
  alter table users
    add column if not exists is_deleted boolean default false not null
`);

await db.execute(sql`
  alter table users
    add column if not exists deleted_at timestamp
`);

await db.execute(sql`
  create index if not exists users_active_lookup_idx
    on users (id, is_deleted)
`);

await db.execute(sql`
  create table if not exists stories (
    id text primary key not null,
    user_id text not null,
    media_url text not null,
    media_type text not null,
    caption text,
    created_at timestamp default now() not null,
    expires_at timestamp not null,
    deleted_at timestamp
  )
`);

await db.execute(sql`
  create index if not exists stories_user_created_at_idx
    on stories (user_id, created_at)
`);

await db.execute(sql`
  create index if not exists stories_active_expires_at_idx
    on stories (expires_at, deleted_at)
`);

await db.execute(sql`
  create table if not exists story_views (
    id text primary key not null,
    story_id text not null,
    user_id text not null,
    viewed_at timestamp default now() not null
  )
`);

await db.execute(sql`
  create unique index if not exists story_views_story_user_unique_idx
    on story_views (story_id, user_id)
`);

await db.execute(sql`
  create index if not exists story_views_user_viewed_at_idx
    on story_views (user_id, viewed_at)
`);

await closeDb();
