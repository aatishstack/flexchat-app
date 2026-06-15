import "dotenv/config";

import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../config/env.js";

export interface JwtPayload {
  id: string;
}

const jwtPayloadSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export function signToken(
  payload: JwtPayload
) {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "7d",
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

  return parsedPayload.data;
}
