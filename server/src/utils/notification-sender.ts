import { db } from "../db/index.js";
import { notifications } from "../db/schema/notifications.js";
import { generateId } from "../lib/uuid.js";
import { FcmService } from "../services/fcm.service.js";
import { getSocketServer } from "../socket/socket-hub.js";
import { SOCKET_EVENTS } from "../socket/socket-events.js";

export type NotificationType = 
  | "missed_call"
  | "message_reaction"
  | "story_reaction"
  | "story_reply"
  | "friend_request";

interface CreateNotificationInput {
  userId: string;
  actorId?: string;
  type: NotificationType;
  entityId?: string;
  metadata?: any;
  title: string;
  body: string;
}

export async function createNotification({
  userId,
  actorId,
  type,
  entityId,
  metadata,
  title,
  body,
}: CreateNotificationInput) {
  try {
    const id = generateId();
    
    // Persist to DB
    const [inserted] = await db.insert(notifications).values({
      id,
      userId,
      actorId,
      type,
      entityId,
      title,
      body,
      metadata: metadata ? JSON.stringify(metadata) : null,
      isRead: false,
    }).returning();

    // Emit via Socket.io
    const io = getSocketServer();
    if (io) {
      io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        notification: {
          id: inserted.id,
          title: inserted.title,
          message: inserted.body,
          createdAt: inserted.createdAt,
          read: inserted.isRead,
          kind: inserted.type,
        },
      });
    }

    // Try sending push
    void FcmService
      .sendToUser(userId, {
        title,
        body,
        data: {
          notificationId: id,
          type,
          entityId: entityId || "",
          ...(metadata || {}),
        },
      })
      .catch((error) => {
        console.error("[Notification] Failed to send push:", error);
      });

    return id;
  } catch (error) {
    console.error("[Notification] Failed to create notification:", error);
    return null;
  }
}
