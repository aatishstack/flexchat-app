import {
  Socket,
} from "socket.io";

import {
  verifyToken,
} from "../lib/jwt.js";

export async function authenticateSocket(
  socket: Socket
) {
  const token =
    socket.handshake.auth
      ?.token ??
    socket.handshake.headers
      .authorization
      ?.replace("Bearer ", "");

  if (!token) {
    return false;
  }

  try {
    const decoded =
      verifyToken(
        token
      );

    socket.data.user =
      {
        id:
          decoded.id,
      };

    return true;
  } catch {
    return false;
  }
}
