import "dotenv/config";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export interface JwtPayload {
  id: string;
}

export function signToken(
  payload: JwtPayload
) {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    {
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
  return jwt.verify(
    token,
    env.JWT_SECRET
  ) as JwtPayload;
}
