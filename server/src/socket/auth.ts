import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "flexchat_secret";

export async function verifySocketToken(token?: string) {
  try {
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      username: string;
    };

    return decoded;
  } catch {
    return null;
  }
}