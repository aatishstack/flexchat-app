import { db } from "../db/index.js";
import { notifications } from "../db/schema/notifications.js";
import { generateId } from "../lib/uuid.js";
import { FcmService } from "../services/fcm.service.js";

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
    await db.insert(notifications).values({
      id,
      userId,
      actorId,
      type,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      isRead: false,
    });

    // Try sending push
    void FcmService.sendToUser(userId, {
      title,
      body,
      data: {
        notificationId: id,
        type,
        entityId: entityId || "",
        ...metadata,
      },
    });

    return id;
  } catch (error) {
    console.error("[Notification] Failed to create notification:", error);
    return null;
  }
}
