import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../config/env.js";

let client: any;
let dbInstance: any;

if (process.env.TESTING === "true") {
  // In-memory mock database state
  const mockDbState = {
    users: [] as any[],
    refreshTokens: [] as any[],
    blocks: [] as any[],
    conversations: [] as any[],
    conversationMembers: [] as any[],
    stories: [] as any[],
    storyViews: [] as any[],
  };

  const getSelectColumns = (query: string): string[] => {
    const match = query.match(/select\s+([\s\S]+?)\s+from/i);
    if (!match) return [];
    return match[1].split(",").map((col) => {
      const parts = col.trim().split(/\s+as\s+/i);
      const colName = parts[parts.length - 1].replace(/[\s\r\n]+/g, " ").trim().replace(/"/g, "");
      const colParts = colName.split(".");
      return colParts[colParts.length - 1];
    });
  };

  const getReturningColumns = (query: string): string[] => {
    const match = query.match(/returning\s+([\s\S]+)$/i);
    if (!match) return [];
    return match[1].split(",").map((col) => {
      const parts = col.trim().split(/\s+as\s+/i);
      const colName = parts[parts.length - 1].replace(/[\s\r\n]+/g, " ").trim().replace(/"/g, "");
      const colParts = colName.split(".");
      return colParts[colParts.length - 1];
    });
  };

  const buildDynamicRow = (sourceObj: any, columns: string[]) => {
    const row: any = {};
    columns.forEach((col) => {
      let val = sourceObj[col];
      if (val === undefined) {
        const camel = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        val = sourceObj[camel];
      }
      row[col] = val !== undefined ? val : null;
    });
    return row;
  };

  const queryFnInternal = async (sql: any, params: any[] = []) => {
    const sqlStr = typeof sql === "string" ? sql : (sql.text || sql.strings?.join("?") || String(sql));

    // Handle user insert queries
    if (sqlStr.includes('insert into "users"') || sqlStr.includes('insert into users')) {
      const [id, username, email, password, avatar] = params;
      const newUser = {
        id,
        username,
        email,
        password,
        avatar: avatar || null,
        avatar_public_id: null,
        avatar_secure_url: null,
        avatar_resource_type: null,
        phone_number: null,
        phone_number_normalized: null,
        is_deleted: false,
        deleted_at: null,
        last_seen_at: null,
        token_version: 0,
        created_at: new Date(),
      };
      mockDbState.users.push(newUser);
      const cols = getReturningColumns(sqlStr);
      const row = cols.length > 0 ? buildDynamicRow(newUser, cols) : newUser;
      return [row];
    }

    // Handle user SELECT queries
    if (sqlStr.includes("select") && (sqlStr.includes('"users"') || sqlStr.includes("users")) && !sqlStr.includes("stories") && !sqlStr.includes("conversations")) {
      // 1. Check if it's a join of blocks and users (e.g. GET /users/blocked)
      if ((sqlStr.includes("blocks") || sqlStr.includes('"blocks"')) && sqlStr.includes("join")) {
        const cols = getSelectColumns(sqlStr);
        const blockerId = params[0];
        const userBlocks = mockDbState.blocks.filter(b => b.blockerId === blockerId);
        const found = userBlocks.map(b => {
          const u = mockDbState.users.find(usr => usr.id === b.blockedId && !usr.is_deleted);
          if (!u) return null;
          return {
            id: u.id,
            username: u.username,
            avatar: u.avatar,
            createdAt: b.createdAt,
          };
        }).filter(Boolean);
        return found.map(item => buildDynamicRow(item, cols));
      }

      const cols = getSelectColumns(sqlStr);
      let found: any[] = [];

      if (sqlStr.includes('."email" =')) {
        const email = params[0];
        found = mockDbState.users.filter(u => u.email === email && !u.is_deleted);
      } else if (sqlStr.includes('."username" =')) {
        const username = params[0];
        found = mockDbState.users.filter(u => u.username === username && !u.is_deleted);
      } else if (sqlStr.includes('."id" =') || sqlStr.includes('where id =') || sqlStr.includes('where "id" =') || sqlStr.includes('where u.id =') || sqlStr.includes('where "u"."id" =')) {
        const id = params[0];
        found = mockDbState.users.filter(u => u.id === id && !u.is_deleted);
      } else if (sqlStr.includes('."id" in') || sqlStr.includes('"id" in') || sqlStr.includes('id in')) {
        found = mockDbState.users.filter(u => params.includes(u.id) && !u.is_deleted);
      } else {
        // Fallback for discover/list/search queries on users
        const currentUserId = params[0];
        found = mockDbState.users.filter(u => {
          if (u.is_deleted || u.id === currentUserId) return false;
          // Filter out blocked relationships
          const isBlockedRel = mockDbState.blocks.some(b =>
            (b.blockerId === currentUserId && b.blockedId === u.id) ||
            (b.blockerId === u.id && b.blockedId === currentUserId)
          );
          if (isBlockedRel) return false;
          return true;
        });
      }

      return found.map(u => buildDynamicRow(u, cols));
    }

    // Handle user UPDATE queries
    if (sqlStr.includes("update") && (sqlStr.includes('"users"') || sqlStr.includes("users"))) {
      const id = params[params.length - 1];
      const user = mockDbState.users.find(u => u.id === id);
      if (user) {
        user.token_version += 1;
      }
      const cols = getReturningColumns(sqlStr);
      return [user ? buildDynamicRow(user, cols) : null];
    }

    // Handle refreshToken queries
    if (sqlStr.includes('insert into "refresh_tokens"') || sqlStr.includes('insert into refresh_tokens')) {
      const [id, userId, tokenHash, deviceId, expiresAt] = params;
      const newToken = {
        id,
        userId,
        tokenHash,
        deviceId,
        expiresAt,
        createdAt: new Date(),
      };
      mockDbState.refreshTokens.push(newToken);
      const cols = getReturningColumns(sqlStr);
      const row = cols.length > 0 ? buildDynamicRow(newToken, cols) : newToken;
      return [row];
    }

    if (sqlStr.includes("select") && (sqlStr.includes('"refresh_tokens"') || sqlStr.includes("refresh_tokens"))) {
      const cols = getSelectColumns(sqlStr);
      let found: any[] = [];

      if (sqlStr.includes('."token_hash" =')) {
        const tokenHash = params[0];
        found = mockDbState.refreshTokens.filter(t => t.tokenHash === tokenHash);
      } else if (sqlStr.includes('."user_id" =')) {
        const userId = params[0];
        found = mockDbState.refreshTokens.filter(t => t.userId === userId);
      }

      return found.map(t => buildDynamicRow(t, cols));
    }

    if (sqlStr.includes("delete from") && (sqlStr.includes('"refresh_tokens"') || sqlStr.includes("refresh_tokens"))) {
      if (sqlStr.includes('."id" =')) {
        const id = params[0];
        const index = mockDbState.refreshTokens.findIndex(t => t.id === id);
        if (index !== -1) {
          mockDbState.refreshTokens.splice(index, 1);
        }
        return [];
      }
      if (sqlStr.includes('."token_hash" =')) {
        const tokenHash = params[0];
        const index = mockDbState.refreshTokens.findIndex(t => t.tokenHash === tokenHash);
        if (index !== -1) {
          mockDbState.refreshTokens.splice(index, 1);
        }
        return [];
      }
      if (sqlStr.includes('."user_id" =')) {
        const userId = params[0];
        mockDbState.refreshTokens = mockDbState.refreshTokens.filter(t => t.userId !== userId);
        return [];
      }
    }

    if (sqlStr.includes("delete from") && (sqlStr.includes('"blocks"') || sqlStr.includes("blocks"))) {
      const blockerId = params[0];
      const blockedId = params[1];
      mockDbState.blocks = mockDbState.blocks.filter(
        (b) => !(b.blockerId === blockerId && b.blockedId === blockedId)
      );
      return [];
    }

    // Generic INSERT helper for testing new tables
    const getInsertColumns = (query: string): string[] => {
      const match = query.match(/insert\s+into\s+["\w]+\s*\((.+?)\)/i);
      if (!match) return [];
      return match[1].split(",").map((col) => col.trim().replace(/"/g, ""));
    };

    const buildInsertedObj = (query: string, paramsList: any[]) => {
      const columns = getInsertColumns(query);
      const newObj: any = {};
      columns.forEach((col, i) => {
        const camel = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        newObj[camel] = paramsList[i];
      });
      newObj.id = newObj.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      newObj.createdAt = newObj.createdAt || new Date();
      return newObj;
    };

    // Handle blocks insert
    if (sqlStr.includes('insert into "blocks"') || sqlStr.includes('insert into blocks')) {
      const newBlock = buildInsertedObj(sqlStr, params);
      mockDbState.blocks.push(newBlock);
      const cols = getReturningColumns(sqlStr);
      return [buildDynamicRow(newBlock, cols)];
    }

    // Handle blocks select
    if (sqlStr.includes("select") && (sqlStr.includes('"blocks"') || sqlStr.includes("blocks")) && !sqlStr.includes("stories") && !sqlStr.includes("conversations")) {
      const cols = getSelectColumns(sqlStr);
      let found = mockDbState.blocks;
      if (sqlStr.includes('."blocker_id" =') && sqlStr.includes('."blocked_id" =')) {
        if (params.length >= 4) {
          found = mockDbState.blocks.filter(b =>
            (b.blockerId === params[0] && b.blockedId === params[1]) ||
            (b.blockerId === params[2] && b.blockedId === params[3])
          );
        } else if (params.length === 2) {
          found = mockDbState.blocks.filter(b =>
            (b.blockerId === params[0] && b.blockedId === params[1])
          );
        }
      }
      return found.map(b => buildDynamicRow(b, cols));
    }

    // Handle conversations insert
    if (sqlStr.includes('insert into "conversations"') || sqlStr.includes('insert into conversations')) {
      const newConvo = buildInsertedObj(sqlStr, params);
      if (!newConvo.type) {
        newConvo.type = "direct";
      }
      mockDbState.conversations.push(newConvo);
      const cols = getReturningColumns(sqlStr);
      return [buildDynamicRow(newConvo, cols)];
    }

    // Handle conversations select
    if (sqlStr.includes("select") && (sqlStr.includes('"conversations"') || sqlStr.includes("conversations"))) {
      const cols = getSelectColumns(sqlStr);
      let found = mockDbState.conversations;
      if (sqlStr.includes('."id" =')) {
        const id = params[0];
        found = mockDbState.conversations.filter(c => c.id === id);
      }
      return found.map(c => buildDynamicRow(c, cols));
    }

    // Handle stories insert
    if (sqlStr.includes('insert into "stories"') || sqlStr.includes('insert into stories')) {
      const [id, userId, mediaUrl, mediaType, expiresAt] = params;
      const newStory = {
        id,
        userId,
        mediaUrl,
        mediaType,
        expiresAt: new Date(expiresAt),
        createdAt: new Date(),
        viewCount: 0,
        visibility: "contacts",
        durationSeconds: 5,
        caption: null,
        deletedAt: null,
      };
      mockDbState.stories.push(newStory);
      const cols = getReturningColumns(sqlStr);
      return [buildDynamicRow(newStory, cols)];
    }

    // Handle story_views insert
    if (sqlStr.includes('insert into "story_views"') || sqlStr.includes('insert into story_views')) {
      const newView = buildInsertedObj(sqlStr, params);
      mockDbState.storyViews.push(newView);
      const cols = getReturningColumns(sqlStr);
      return [buildDynamicRow(newView, cols)];
    }

    // Handle stories select
    if (sqlStr.includes("select") && (sqlStr.includes('"stories"') || sqlStr.includes("stories"))) {
      const cols = ["id", "userId", "mediaUrl", "mediaType", "visibility", "durationSeconds", "caption", "createdAt", "expiresAt", "viewed", "viewCount", "user"];
      const currentUserId = params[0];
      
      let found = mockDbState.stories;
      
      const storyIdParam = params.find(p => typeof p === "string" && p.startsWith("story_"));
      if (storyIdParam) {
        found = found.filter(s => s.id === storyIdParam);
      }

      // Filter out blocks
      found = found.filter(s => {
        const isBlockedRel = mockDbState.blocks.some(b =>
          (b.blockerId === currentUserId && b.blockedId === s.userId) ||
          (b.blockerId === s.userId && b.blockedId === currentUserId)
        );
        return !isBlockedRel;
      });

      const result = found.map(s => {
        const u = mockDbState.users.find(usr => usr.id === s.userId);
        return {
          ...s,
          user: u ? { id: u.id, username: u.username, avatar: u.avatar } : null,
          viewCount: mockDbState.storyViews.filter(v => v.storyId === s.id && v.userId !== s.userId).length,
          viewed: mockDbState.storyViews.some(v => v.storyId === s.id && v.userId === currentUserId),
        };
      });

      return result.map(s => buildDynamicRow(s, cols));
    }

    // Handle conversation members insert
    if (sqlStr.includes('insert into "conversation_members"') || sqlStr.includes('insert into conversation_members')) {
      const newMember = buildInsertedObj(sqlStr, params);
      mockDbState.conversationMembers.push(newMember);
      const cols = getReturningColumns(sqlStr);
      return [buildDynamicRow(newMember, cols)];
    }

    // Handle conversation members select
    if (sqlStr.includes("select") && (sqlStr.includes('"conversation_members"') || sqlStr.includes("conversation_members"))) {
      const cols = getSelectColumns(sqlStr);
      let found = mockDbState.conversationMembers;
      if (sqlStr.includes('."conversation_id" =') && sqlStr.includes('."user_id" <>')) {
        const convoId = params[0];
        const excludeUserId = params[1];
        found = mockDbState.conversationMembers.filter(m => m.conversationId === convoId && m.userId !== excludeUserId);
      } else if (sqlStr.includes('."conversation_id" =')) {
        const convoId = params[0];
        found = mockDbState.conversationMembers.filter(m => m.conversationId === convoId);
      } else if (sqlStr.includes('."user_id" =')) {
        const userId = params[0];
        found = mockDbState.conversationMembers.filter(m => m.userId === userId);
      }
      return found.map(m => buildDynamicRow(m, cols));
    }

    return [];
  };

  const queryFn = (sql: any, params: any[] = []) => {
    const p = queryFnInternal(sql, params);
    const promise = p.then(rows => rows);
    (promise as any).values = () => {
      return p.then(rows => {
        if (!rows || rows.length === 0) return [];
        return rows.map(row => Object.values(row));
      });
    };
    return promise;
  };

  (queryFn as any).unsafe = queryFn;
  (queryFn as any).begin = async (cb: any) => {
    return cb(queryFn);
  };
  (queryFn as any).end = async () => {};
  (queryFn as any).options = {
    parsers: {},
    serializers: {},
  };

  client = queryFn;
} else {
  client = postgres(env.DATABASE_URL, {
    // Bounded pool per instance so multiple Railway replicas don't exhaust the
    // Neon connection limit. Pair with Neon's pooled (-pooler) endpoint.
    max: env.DATABASE_POOL_MAX,
    // Release idle connections so Neon can reclaim them (serverless autosuspend).
    idle_timeout: 30,
    // Fail fast instead of hanging if the DB is unreachable.
    connect_timeout: 10,
    // Required when DATABASE_URL points at Neon's PgBouncer (-pooler) endpoint:
    // transaction-mode pooling does not support prepared statements.
    prepare: false,
  });
}

export const db = drizzle(client as ReturnType<typeof postgres>);

export async function closeDb() {
  if (process.env.TESTING !== "true" && client && typeof client.end === "function") {
    await client.end();
  }
}
