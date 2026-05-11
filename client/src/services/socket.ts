import { io } from "socket.io-client";

let socket: any = null;

export const connect = () => {
  if (socket) return socket;

  socket = io("http://localhost:5000");

  return socket;
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  return socket;
};

connect();