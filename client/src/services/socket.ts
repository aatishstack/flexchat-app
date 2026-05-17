import { socket } from "@/socket/socket";

export const connect = (token?: string) => {
  if (token) {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnect = () => {
  socket.disconnect();
};

export const getSocket = () => socket;
