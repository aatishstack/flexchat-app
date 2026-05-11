import { io, Socket } from "socket.io-client";

let socket: Socket;

export const connect = () => {
  if (!socket) {
    socket = io("http://localhost:5000");
  }

  return socket;
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
  }
};

export const getSocket = () => {
  return socket;
};