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
  };

  const getSelectColumns = (query: string): string[] => {
    const match = query.match(/select\s+(.+?)\s+from/i);
    if (!match) return [];
    return match[1].split(",").map((col) => {
      const parts = col.trim().split(/\s+as\s+/i);
      const colName = parts[parts.length - 1].trim().replace(/"/g, "");
      const colParts = colName.split(".");
      return colParts[colParts.length - 1];
    });
  };

  const getReturningColumns = (query: string): string[] => {
    const match = query.match(/returning\s+(.+)$/i);
    if (!match) return [];
    return match[1].split(",").map((col) => {
      const parts = col.trim().split(/\s+as\s+/i);
      const colName = parts[parts.length - 1].trim().replace(/"/g, "");
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
    if (sqlStr.includes("select") && (sqlStr.includes('"users"') || sqlStr.includes("users"))) {
      const cols = getSelectColumns(sqlStr);
      let found: any[] = [];

      if (sqlStr.includes('."email" =')) {
        const email = params[0];
        found = mockDbState.users.filter(u => u.email === email && !u.is_deleted);
      } else if (sqlStr.includes('."username" =')) {
        const username = params[0];
        found = mockDbState.users.filter(u => u.username === username && !u.is_deleted);
      } else if (sqlStr.includes('."id" =')) {
        const id = params[0];
        found = mockDbState.users.filter(u => u.id === id && !u.is_deleted);
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
  client = postgres(env.DATABASE_URL);
}

export const db = drizzle(client as ReturnType<typeof postgres>);

export async function closeDb() {
  if (process.env.TESTING !== "true" && client && typeof client.end === "function") {
    await client.end();
  }
}
