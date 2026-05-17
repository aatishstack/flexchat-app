import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ??
  "flexchat_local_dev_secret";

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
    JWT_SECRET
  ) as JwtPayload;
}
