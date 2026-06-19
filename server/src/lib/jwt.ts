import "dotenv/config";
import crypto from "crypto";

import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env.js";

export interface JwtPayload {
  id: string;
  tokenVersion?: number;
}

const jwtPayloadSchema = z.object({
  id: z.string().trim().min(1).max(128),
  tokenVersion: z.number().int().nonnegative().optional(),
  type: z.enum(["access", "refresh"]).optional(),
});

export function signToken(
  payload: JwtPayload
) {
  return jwt.sign(
    {
      ...payload,
      type: "access",
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "15m",
    }
  );
}

export function generateToken(
  userId: string
) {
  return signToken({
    id: userId,
  });
}

export function verifyToken(
  token: string
) {
  const decoded = jwt.verify(
    token,
    env.JWT_SECRET,
    {
      algorithms: ["HS256"],
    },
  );
  const parsedPayload = jwtPayloadSchema.safeParse(decoded);

  if (!parsedPayload.success) {
    throw new Error("Invalid token payload");
  }

  if (parsedPayload.data.type !== "access") {
    throw new Error("Invalid token type: expected access");
  }

  return parsedPayload.data;
}

export function verifyTokenIgnoringExpiration(
  token: string
) {
  const decoded = jwt.verify(
    token,
    env.JWT_SECRET,
    {
      algorithms: ["HS256"],
      ignoreExpiration: true,
    },
  );
  const parsedPayload = jwtPayloadSchema.safeParse(decoded);

  if (!parsedPayload.success) {
    throw new Error("Invalid token payload");
  }

  if (parsedPayload.data.type !== "access") {
    throw new Error("Invalid token type: expected access");
  }

  return parsedPayload.data;
}

export function signRefreshToken(
  payload: JwtPayload
) {
  return jwt.sign(
    {
      ...payload,
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "30d",
    }
  );
}

export function verifyRefreshToken(
  token: string
) {
  const decoded = jwt.verify(
    token,
    env.JWT_SECRET,
    {
      algorithms: ["HS256"],
    },
  );
  const parsedPayload = jwtPayloadSchema.safeParse(decoded);

  if (!parsedPayload.success) {
    throw new Error("Invalid refresh token payload");
  }

  if (parsedPayload.data.type !== "refresh") {
    throw new Error("Invalid token type: expected refresh");
  }

  return parsedPayload.data;
}

export function hashRefreshToken(
  token: string
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function generateRandomTokenString(): string {
  return crypto.randomBytes(40).toString("hex");
}
