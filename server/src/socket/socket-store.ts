export const onlineUsers = new Map<
  string,
  Set<string>
>();

export const socketUsers = new Map<
  string,
  string
>();

export function addOnlineSocket(
  userId: string,
  socketId: string
) {
  const sockets =
    onlineUsers.get(userId) ??
    new Set<string>();

  sockets.add(socketId);
  onlineUsers.set(userId, sockets);
  socketUsers.set(socketId, userId);
}

export function removeOnlineSocket(
  socketId: string
) {
  const userId =
    socketUsers.get(socketId);

  if (!userId) {
    return null;
  }

  const sockets =
    onlineUsers.get(userId);

  sockets?.delete(socketId);

  if (!sockets?.size) {
    onlineUsers.delete(userId);
  }

  socketUsers.delete(socketId);

  return userId;
}

export function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}
