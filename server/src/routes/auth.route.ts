import {
  FastifyInstance,
  FastifyReply,
} from "fastify";

import bcrypt from "bcrypt";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

import { and, eq, sql } from "drizzle-orm";

import { z } from "zod";

import { env } from "../config/env.js";
import { db } from "../db/index.js";

import { users } from "../db/schema/users.js";

import { generateId } from "../lib/uuid.js";
import { signToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const blockedDomains = new Set([
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "fakeinbox.com",
]);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerBodySchema = z.object({
  username: z.string().trim().min(1).max(32),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

const googleStartQuerySchema = z.object({
  frontendOrigin: z.string().trim().url().optional(),
  popup: z.coerce.boolean().default(true),
});

const googleCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  error: z.string().trim().optional(),
  error_description: z.string().trim().optional(),
});

const googleStatePayloadSchema = z.object({
  nonce: z.string().min(16),
  frontendOrigin: z.string().url(),
  redirectUri: z.string().url(),
  popup: z.boolean(),
  createdAt: z.number().int().positive(),
});

const googleTokenResponseSchema = z.object({
  access_token: z.string().min(1).optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const googleUserInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.union([z.boolean(), z.string()]).optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function publicUser(user: {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  createdAt?: Date | string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar ?? null,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
      : (user.createdAt ?? null),
  };
}

function normalizeOrigin(value: string) {
  return new URL(value).origin;
}

function getConfiguredFrontendOrigins() {
  const origins = [
    env.FRONTEND_URL,
    env.CLIENT_URL,
    ...env.CORS_ORIGIN
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin && origin !== "*"),
  ];

  if (env.NODE_ENV !== "production") {
    origins.push(
      "http://localhost:3000",
      "https://localhost:3000",
      "http://127.0.0.1:3000",
      "https://127.0.0.1:3000",
    );
  }

  return Array.from(
    new Set(
      origins
        .filter((origin): origin is string => Boolean(origin))
        .map((origin) => normalizeOrigin(origin)),
    ),
  );
}

function resolveFrontendOrigin(value: string | undefined) {
  const fallbackOrigin = normalizeOrigin(env.CLIENT_URL ?? env.FRONTEND_URL);
  const requestedOrigin = value ? normalizeOrigin(value) : fallbackOrigin;
  const allowedOrigins = getConfiguredFrontendOrigins();

  return allowedOrigins.includes(requestedOrigin) ? requestedOrigin : null;
}

function getGoogleCallbackUrl() {
  return (
    env.GOOGLE_CALLBACK_URL ??
    `${normalizeOrigin(env.PUBLIC_API_URL)}/auth/google/callback`
  );
}

function getGoogleOAuthConfig() {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getGoogleCallbackUrl(),
  };
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signStatePayload(encodedPayload: string) {
  return createHmac("sha256", env.JWT_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function createGoogleState(payload: z.infer<typeof googleStatePayloadSchema>) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signStatePayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyGoogleState(value: string) {
  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signStatePayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }

  const parsedState = googleStatePayloadSchema.safeParse(parsedPayload);

  if (!parsedState.success) {
    return null;
  }

  if (Date.now() - parsedState.data.createdAt > GOOGLE_OAUTH_STATE_TTL_MS) {
    return null;
  }

  return parsedState.data;
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function sendGooglePopupResponse(
  reply: FastifyReply,
  payload: Record<string, unknown>,
  frontendOrigin: string,
) {
  const payloadJson = safeJson(payload);
  const frontendOriginJson = safeJson(frontendOrigin);

  return reply
    .type("text/html; charset=utf-8")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>FlexChat Google Sign-In</title>
  </head>
  <body>
    <script>
      (() => {
        const payload = ${payloadJson};
        const targetOrigin = ${frontendOriginJson};
        const payloadType = payload && payload.type;

        if (window.opener && !window.opener.closed) {
          console.info("[OAUTH] popup callback response", {
            type: payloadType,
            hasToken: Boolean(payload && payload.token),
            hasUser: Boolean(payload && payload.user),
            targetOrigin,
          });
          window.opener.postMessage(payload, targetOrigin);
          console.info("[OAUTH] postMessage sent", {
            type: payloadType,
            targetOrigin,
          });
          window.setTimeout(() => window.close(), 0);
          return;
        }

        console.warn("[OAUTH] popup opener unavailable", {
          type: payloadType,
          targetOrigin,
        });
        window.location.replace(targetOrigin + "/auth");
      })();
    </script>
  </body>
</html>`);
}

type UserRow = {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar: string | null;
  createdAt: Date;
};

function normalizeUsername(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return normalized || "flexuser";
}

async function createUniqueUsername(preferredName: string) {
  const baseUsername = normalizeUsername(preferredName);

  for (let index = 0; index < 12; index += 1) {
    const candidate =
      index === 0
        ? baseUsername
        : `${baseUsername}_${generateId().replace(/-/g, "").slice(0, 6)}`.slice(
            0,
            32,
          );

    const existingUser = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(and(eq(users.username, candidate), eq(users.isDeleted, false)));

    if (!existingUser.length) {
      return candidate;
    }
  }

  return `flex_${generateId().replace(/-/g, "").slice(0, 12)}`;
}

function isGoogleEmailVerified(value: boolean | string | undefined) {
  return value === true || value === "true";
}

async function findOrCreateGoogleUser(profile: z.infer<typeof googleUserInfoSchema>) {
  const email = profile.email.trim().toLowerCase();
  const existingUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isDeleted, false)));
  let user: UserRow | undefined = existingUsers[0];

  if (user) {
    const googleAvatar = profile.picture ?? null;

    if (googleAvatar && !user.avatar) {
      const updatedUsers = await db.execute<UserRow>(sql`
        update users
        set avatar = ${googleAvatar}
        where id = ${user.id}
        returning
          id,
          username,
          email,
          password,
          avatar,
          created_at as "createdAt"
      `);

      user = updatedUsers[0] ?? user;
    }

    return user;
  }

  const preferredUsername = profile.name ?? email.split("@")[0] ?? "flexuser";
  const username = await createUniqueUsername(preferredUsername);
  const password = await bcrypt.hash(
    `google:${profile.sub}:${generateId()}`,
    10,
  );
  const userId = generateId();
  const createdUsers = await db.execute<UserRow>(sql`
    insert into users (
      id,
      username,
      email,
      password,
      avatar
    )
    values (
      ${userId},
      ${username},
      ${email},
      ${password},
      ${profile.picture ?? null}
    )
    returning
      id,
      username,
      email,
      password,
      avatar,
      created_at as "createdAt"
  `);

  return createdUsers[0];
}

export async function authRoutes(app: FastifyInstance) {
  // REGISTER
  app.post(
    "/auth/register",

    async (request, reply) => {
      const parsedBody = registerBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid registration request",
        });
      }

      const { username, email, password } = parsedBody.data;

      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          message: "Invalid email address",
        });
      }

      const domain = email.split("@")[1];

      if (blockedDomains.has(domain)) {
        return reply.status(400).send({
          message: "Temporary emails are not allowed",
        });
      }

      if (password.length < 8) {
        return reply.status(400).send({
          message: "Password must be at least 8 characters",
        });
      }

      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.isDeleted, false)));

      if (existingUser.length) {
        return reply.status(400).send({
          message: "Email already exists",
        });
      }

      const existingUsername = await db
        .select()
        .from(users)
        .where(and(eq(users.username, username), eq(users.isDeleted, false)));

      if (existingUsername.length) {
        return reply.status(400).send({
          message: "Username already taken",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = {
        id: generateId(),

        username: username,

        email: email,

        password: hashedPassword,
      };

      const insertedUsers = await db.execute<UserRow>(sql`
        insert into users (
          id,
          username,
          email,
          password
        )
        values (
          ${newUser.id},
          ${newUser.username},
          ${newUser.email},
          ${newUser.password}
        )
        returning
          id,
          username,
          email,
          password,
          avatar,
          created_at as "createdAt"
      `);
      const createdUser = insertedUsers[0] ?? newUser;

      const token = signToken({
        id: createdUser.id,
      });

      return {
        token,

        user: publicUser(createdUser),
      };
    },
  );

  app.get("/auth/google/start", async (request, reply) => {
    const parsedQuery = googleStartQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      return reply.status(400).send({
        message: "Invalid Google OAuth request",
      });
    }

    const oauthConfig = getGoogleOAuthConfig();

    if (!oauthConfig) {
      request.log.error(
        {
          hasGoogleClientId: Boolean(env.GOOGLE_CLIENT_ID),
          hasGoogleClientSecret: Boolean(env.GOOGLE_CLIENT_SECRET),
          redirectUri: getGoogleCallbackUrl(),
        },
        "Google OAuth is not configured",
      );

      return reply.status(503).send({
        message: "Google sign-in is not configured",
      });
    }

    const frontendOrigin = resolveFrontendOrigin(
      parsedQuery.data.frontendOrigin,
    );

    if (!frontendOrigin) {
      request.log.warn(
        {
          requestedFrontendOrigin: parsedQuery.data.frontendOrigin,
          allowedFrontendOrigins: getConfiguredFrontendOrigins(),
        },
        "Google OAuth rejected an unknown frontend origin",
      );

      return reply.status(400).send({
        message: "Invalid Google sign-in origin",
      });
    }

    const state = createGoogleState({
      nonce: randomBytes(18).toString("base64url"),
      frontendOrigin,
      redirectUri: oauthConfig.redirectUri,
      popup: parsedQuery.data.popup,
      createdAt: Date.now(),
    });
    const authUrl = new URL(GOOGLE_AUTH_URL);

    authUrl.searchParams.set("client_id", oauthConfig.clientId);
    authUrl.searchParams.set("redirect_uri", oauthConfig.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    request.log.info(
      {
        redirectUri: oauthConfig.redirectUri,
        frontendOrigin,
        googleClientId: oauthConfig.clientId,
      },
      "Google OAuth redirect URI sent to Google",
    );

    return reply.redirect(authUrl.toString());
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const parsedQuery = googleCallbackQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      request.log.warn(
        {
          queryKeys:
            request.query && typeof request.query === "object"
              ? Object.keys(request.query)
              : [],
        },
        "Google OAuth callback rejected invalid query parameters",
      );

      return reply.status(400).send({
        message: "Invalid Google callback request",
      });
    }

    const state = parsedQuery.data.state
      ? verifyGoogleState(parsedQuery.data.state)
      : null;
    const frontendOrigin =
      state?.frontendOrigin ?? normalizeOrigin(env.CLIENT_URL ?? env.FRONTEND_URL);

    if (!state) {
      request.log.warn(
        {
          hasState: Boolean(parsedQuery.data.state),
          error: parsedQuery.data.error,
          errorDescription: parsedQuery.data.error_description,
        },
        "Google OAuth callback rejected invalid state",
      );

      return sendGooglePopupResponse(
        reply,
        {
          source: "flexchat-google-oauth",
          type: "flexchat:google-auth:error",
          message: "Google sign-in session expired. Please try again.",
        },
        frontendOrigin,
      );
    }

    const oauthConfig = getGoogleOAuthConfig();

    if (!oauthConfig) {
      request.log.error(
        {
          redirectUri: state.redirectUri,
          hasGoogleClientId: Boolean(env.GOOGLE_CLIENT_ID),
          hasGoogleClientSecret: Boolean(env.GOOGLE_CLIENT_SECRET),
        },
        "Google OAuth callback reached an unconfigured server",
      );

      return sendGooglePopupResponse(
        reply,
        {
          source: "flexchat-google-oauth",
          type: "flexchat:google-auth:error",
          message: "Google sign-in is not configured.",
        },
        state.frontendOrigin,
      );
    }

    if (state.redirectUri !== oauthConfig.redirectUri) {
      request.log.warn(
        {
          stateRedirectUri: state.redirectUri,
          currentRedirectUri: oauthConfig.redirectUri,
        },
        "Google OAuth callback redirect URI changed during sign-in",
      );

      return sendGooglePopupResponse(
        reply,
        {
          source: "flexchat-google-oauth",
          type: "flexchat:google-auth:error",
          message: "Google sign-in configuration changed. Please try again.",
        },
        state.frontendOrigin,
      );
    }

    if (parsedQuery.data.error) {
      request.log.warn(
        {
          error: parsedQuery.data.error,
          errorDescription: parsedQuery.data.error_description,
          redirectUri: oauthConfig.redirectUri,
          frontendOrigin: state.frontendOrigin,
        },
        "Google OAuth provider returned an error",
      );

      return sendGooglePopupResponse(
        reply,
        {
          source: "flexchat-google-oauth",
          type: "flexchat:google-auth:error",
          message:
            parsedQuery.data.error_description ??
            "Google sign-in was canceled or rejected.",
        },
        state.frontendOrigin,
      );
    }

    if (!parsedQuery.data.code) {
      request.log.warn(
        {
          redirectUri: oauthConfig.redirectUri,
          frontendOrigin: state.frontendOrigin,
        },
        "Google OAuth callback missing authorization code",
      );

      return sendGooglePopupResponse(
        reply,
        {
          source: "flexchat-google-oauth",
          type: "flexchat:google-auth:error",
          message: "Google did not return an authorization code.",
        },
        state.frontendOrigin,
      );
    }

    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: parsedQuery.data.code,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          redirect_uri: oauthConfig.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenJson = await tokenResponse.json();
      const parsedToken = googleTokenResponseSchema.safeParse(tokenJson);

      if (
        !tokenResponse.ok ||
        !parsedToken.success ||
        !parsedToken.data.access_token
      ) {
        request.log.warn(
          {
            statusCode: tokenResponse.status,
            redirectUri: oauthConfig.redirectUri,
            frontendOrigin: state.frontendOrigin,
            error:
              parsedToken.success
                ? parsedToken.data.error
                : "invalid_token_response",
            errorDescription:
              parsedToken.success
                ? parsedToken.data.error_description
                : undefined,
          },
          "Google OAuth token exchange failed",
        );

        return sendGooglePopupResponse(
          reply,
          {
            source: "flexchat-google-oauth",
            type: "flexchat:google-auth:error",
            message: "Google sign-in could not be verified.",
          },
          state.frontendOrigin,
        );
      }

      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${parsedToken.data.access_token}`,
        },
      });
      const userInfoJson = await userInfoResponse.json();
      const parsedUserInfo = googleUserInfoSchema.safeParse(userInfoJson);

      if (
        !userInfoResponse.ok ||
        !parsedUserInfo.success ||
        !isGoogleEmailVerified(parsedUserInfo.data.email_verified)
      ) {
        request.log.warn(
          {
            statusCode: userInfoResponse.status,
            redirectUri: oauthConfig.redirectUri,
            frontendOrigin: state.frontendOrigin,
            hasEmail:
              parsedUserInfo.success
                ? Boolean(parsedUserInfo.data.email)
                : false,
            emailVerified:
              parsedUserInfo.success
                ? parsedUserInfo.data.email_verified
                : undefined,
          },
          "Google OAuth userinfo verification failed",
        );

        return sendGooglePopupResponse(
          reply,
          {
            source: "flexchat-google-oauth",
            type: "flexchat:google-auth:error",
            message: "Google account email is not verified.",
          },
          state.frontendOrigin,
        );
      }

      const user = await findOrCreateGoogleUser(parsedUserInfo.data);

      if (!user) {
        request.log.error(
          {
            googleSubject: parsedUserInfo.data.sub,
            frontendOrigin: state.frontendOrigin,
          },
          "Google OAuth did not yield a user record",
        );

        return sendGooglePopupResponse(
          reply,
          {
            source: "flexchat-google-oauth",
            type: "flexchat:google-auth:error",
            message: "Google sign-in failed.",
          },
          state.frontendOrigin,
        );
      }

      const token = signToken({
        id: user.id,
      });

      request.log.info(
        {
          userId: user.id,
          frontendOrigin: state.frontendOrigin,
          redirectUri: oauthConfig.redirectUri,
        },
        "Google OAuth sign-in succeeded",
      );

      return sendGooglePopupResponse(
        reply,
        {
          source: "flexchat-google-oauth",
          type: "flexchat:google-auth:success",
          token,
          user: publicUser(user),
        },
        state.frontendOrigin,
      );
    } catch (error) {
      request.log.error(
        {
          err: error,
          redirectUri: oauthConfig.redirectUri,
          frontendOrigin: state.frontendOrigin,
        },
        "Google OAuth callback failed unexpectedly",
      );

      return sendGooglePopupResponse(
        reply,
        {
          source: "flexchat-google-oauth",
          type: "flexchat:google-auth:error",
          message: "Google sign-in failed. Please try again.",
        },
        state.frontendOrigin,
      );
    }
  });

  // LOGIN
  app.post(
    "/auth/login",

    async (request, reply) => {
      const parsedBody = loginBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: "Invalid login request",
        });
      }

      const { email, password } = parsedBody.data;

      const foundUser = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.isDeleted, false)));

      const user = foundUser[0];

      if (!user) {
        return reply.status(400).send({
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return reply.status(400).send({
          message: "Invalid credentials",
        });
      }

      const token = signToken({
        id: user.id,
      });

      return {
        token,

        user: publicUser(user),
      };
    },
  );

  app.post(
    "/auth/refresh",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({
          message: "Unauthorized",
        });
      }

      const foundUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.isDeleted, false)));

      const user = foundUser[0];

      if (!user) {
        return reply.status(404).send({
          message: "User not found",
        });
      }

      return {
        token: signToken({
          id: user.id,
        }),
        user: publicUser(user),
      };
    },
  );
}
