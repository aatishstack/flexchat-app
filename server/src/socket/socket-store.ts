export interface PresenceAdapter {
  addSocket: (
    userId: string,
    socketId: string
  ) => void;
  touchSocket: (
    socketId: string
  ) => void;
  removeSocket: (
    socketId: string
  ) => string | null;
  removeMissingSockets: (
    activeSocketIds: Set<string>
  ) => string[];
  getOnlineUserIds: () => string[];
  getLastSeenByUserId: (userId: string) => number | null;
}

type SocketPresence = {
  userId: string;
  connectedAt: number;
  lastSeenAt: number;
};

class InMemoryPresenceAdapter
  implements PresenceAdapter
{
  private readonly onlineUsers = new Map<
    string,
    Set<string>
  >();

  private readonly socketUsers = new Map<
    string,
    SocketPresence
  >();

  private readonly lastSeenByUser = new Map<
    string,
    number
  >();

  addSocket(
    userId: string,
    socketId: string
  ) {
    const now = Date.now();
    const sockets =
      this.onlineUsers.get(userId) ??
      new Set<string>();

    sockets.add(socketId);
    this.onlineUsers.set(userId, sockets);
    this.socketUsers.set(socketId, {
      userId,
      connectedAt: now,
      lastSeenAt: now,
    });
  }

  touchSocket(socketId: string) {
    const socketPresence =
      this.socketUsers.get(socketId);

    if (!socketPresence) {
      return;
    }

    socketPresence.lastSeenAt = Date.now();
  }

  removeSocket(socketId: string) {
    const socketPresence =
      this.socketUsers.get(socketId);

    if (!socketPresence) {
      return null;
    }

    const { userId } = socketPresence;
    const sockets =
      this.onlineUsers.get(userId);

    sockets?.delete(socketId);

    if (!sockets?.size) {
      this.onlineUsers.delete(userId);
      this.lastSeenByUser.set(userId, Date.now());
    }

    this.socketUsers.delete(socketId);

    return userId;
  }

  removeMissingSockets(
    activeSocketIds: Set<string>
  ) {
    const changedUserIds =
      new Set<string>();

    Array.from(this.socketUsers.keys()).forEach(
      (socketId) => {
        if (activeSocketIds.has(socketId)) {
          return;
        }

        const userId =
          this.removeSocket(socketId);

        if (userId) {
          changedUserIds.add(userId);
        }
      }
    );

    return Array.from(changedUserIds);
  }

  getOnlineUserIds() {
    return Array.from(this.onlineUsers.keys());
  }

  getLastSeenByUserId(userId: string) {
    return this.lastSeenByUser.get(userId) ?? null;
  }
}

const presenceAdapter: PresenceAdapter =
  new InMemoryPresenceAdapter();

export function addOnlineSocket(
  userId: string,
  socketId: string
) {
  presenceAdapter.addSocket(userId, socketId);
}

export function touchOnlineSocket(
  socketId: string
) {
  presenceAdapter.touchSocket(socketId);
}

export function removeOnlineSocket(
  socketId: string
) {
  return presenceAdapter.removeSocket(socketId);
}

export function removeMissingOnlineSockets(
  activeSocketIds: Set<string>
) {
  return presenceAdapter.removeMissingSockets(
    activeSocketIds
  );
}

export function getOnlineUserIds() {
  return presenceAdapter.getOnlineUserIds();
}

export function getLastSeenByUserId(userId: string) {
  return presenceAdapter.getLastSeenByUserId(userId);
}
