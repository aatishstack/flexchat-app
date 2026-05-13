import {
  Socket,
} from "socket.io";

import {
  verifyToken,
} from "../lib/jwt.js";

export async function authenticateSocket(
  socket: Socket
) {
  try {
    const token =
      socket.handshake.auth
        ?.token;

    if (!token) {
      throw new Error(
        "Unauthorized"
      );
    }

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
  } catch (error) {
    console.error(
      error
    );

    return false;
  }
}