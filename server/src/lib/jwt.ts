import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET!;

export interface JwtPayload {
  id: string;
}

export function signToken(
  payload: JwtPayload
) {
  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

export function verifyToken(
  token: string
) {
  return jwt.verify(
    token,
    JWT_SECRET
  ) as JwtPayload;
}