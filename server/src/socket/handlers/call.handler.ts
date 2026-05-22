import type { Server, Socket } from "socket.io";

import { z } from "zod";

import {
  getConversationMembers,
  isConversationMember,
} from "../../lib/conversation-access.js";
import { generateId } from "../../lib/uuid.js";
import { getOnlineUserIds } from "../socket-store.js";
import { SOCKET_EVENTS } from "../socket-events.js";

type CallKind = "voice" | "video";
type CallStatus = "calling" | "ringing" | "active";

type CallSession = {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  kind: CallKind;
  status: CallStatus;
  startedAt: string;
};

type CallAck = (response: {
  ok: boolean;
  error?: string;
  call?: CallSession;
}) => void;

const callInviteSchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
  targetUserId: z.string().trim().min(1).max(128),
  kind: z.enum(["voice", "video"]),
});

const callIdSchema = z.object({
  callId: z.string().trim().min(1).max(128),
});

const callSignalSchema = z.object({
  callId: z.string().trim().min(1).max(128),
  signal: z.unknown(),
});

const calls = new Map<string, CallSession>();
const activeCallByUser = new Map<string, string>();
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const callExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

const CALL_RECONNECT_GRACE_MS = 15_000;
const CALL_RING_TIMEOUT_MS = 45_000;

function acknowledge(
  ack: CallAck | undefined,
  response: Parameters<CallAck>[0],
) {
  if (typeof ack === "function") {
    ack(response);
  }
}

function participantIds(call: CallSession) {
  return [call.callerId, call.calleeId];
}

function getOtherParticipant(call: CallSession, userId: string) {
  if (call.callerId === userId) {
    return call.calleeId;
  }

  if (call.calleeId === userId) {
    return call.callerId;
  }

  return null;
}

function userCallTimerKey(callId: string, userId: string) {
  return `${callId}:${userId}`;
}

function clearUserDisconnectTimers(userId: string) {
  disconnectTimers.forEach((timer, key) => {
    if (!key.endsWith(`:${userId}`)) {
      return;
    }

    clearTimeout(timer);
    disconnectTimers.delete(key);
  });
}

function closeCall(io: Server, callId: string, reason: string) {
  const call = calls.get(callId);

  if (!call) {
    return;
  }

  calls.delete(callId);
  activeCallByUser.delete(call.callerId);
  activeCallByUser.delete(call.calleeId);

  const expiryTimer = callExpiryTimers.get(callId);

  if (expiryTimer) {
    clearTimeout(expiryTimer);
    callExpiryTimers.delete(callId);
  }

  participantIds(call).forEach((userId) => {
    const timerKey = userCallTimerKey(callId, userId);
    const timer = disconnectTimers.get(timerKey);

    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(timerKey);
    }

    io.to(`user:${userId}`).emit(SOCKET_EVENTS.CALL_ENDED, {
      callId,
      reason,
    });
  });
}

function emitCallError(socket: Socket, message: string, callId?: string) {
  socket.emit(SOCKET_EVENTS.CALL_ERROR, {
    callId,
    message,
  });
}

async function canCallTarget(
  callerId: string,
  conversationId: string,
  targetUserId: string,
) {
  if (callerId === targetUserId) {
    return false;
  }

  const [callerAllowed, targetAllowed] = await Promise.all([
    isConversationMember(callerId, conversationId),
    isConversationMember(targetUserId, conversationId),
  ]);

  if (!callerAllowed || !targetAllowed) {
    return false;
  }

  const members = await getConversationMembers([conversationId]);

  return (
    members.some((member) => member.userId === callerId) &&
    members.some((member) => member.userId === targetUserId)
  );
}

export function registerCallHandlers(io: Server, socket: Socket) {
  const userId = socket.data.user.id as string;

  clearUserDisconnectTimers(userId);

  const activeCallId = activeCallByUser.get(userId);

  if (activeCallId) {
    const activeCall = calls.get(activeCallId);

    if (activeCall?.calleeId === userId && activeCall.status !== "active") {
      socket.emit(SOCKET_EVENTS.CALL_INCOMING, activeCall);
    } else if (activeCall?.status === "active") {
      participantIds(activeCall).forEach((participantId) => {
        io.to(`user:${participantId}`).emit(
          SOCKET_EVENTS.CALL_ACCEPTED,
          activeCall,
        );
      });
    }
  }

  socket.on(
    SOCKET_EVENTS.CALL_INVITE,
    async (payload: unknown, ack?: CallAck) => {
      const parsed = callInviteSchema.safeParse(payload);

      if (!parsed.success) {
        acknowledge(ack, {
          ok: false,
          error: "Invalid call request",
        });
        return;
      }

      const { conversationId, targetUserId, kind } = parsed.data;

      const allowed = await canCallTarget(userId, conversationId, targetUserId);

      if (!allowed) {
        acknowledge(ack, {
          ok: false,
          error: "Call unavailable",
        });
        return;
      }

      if (activeCallByUser.has(userId) || activeCallByUser.has(targetUserId)) {
        acknowledge(ack, {
          ok: false,
          error: "User is already in another call",
        });
        return;
      }

      const targetOnline = getOnlineUserIds().includes(targetUserId);
      const call: CallSession = {
        id: generateId(),
        conversationId,
        callerId: userId,
        calleeId: targetUserId,
        kind,
        status: targetOnline ? "ringing" : "calling",
        startedAt: new Date().toISOString(),
      };

      calls.set(call.id, call);
      activeCallByUser.set(userId, call.id);
      activeCallByUser.set(targetUserId, call.id);

      socket.join(`call:${call.id}`);

      if (targetOnline) {
        io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CALL_INCOMING, call);
      }

      const expiryTimer = setTimeout(() => {
        const activeCall = calls.get(call.id);

        if (!activeCall || activeCall.status === "active") {
          return;
        }

        closeCall(io, call.id, targetOnline ? "missed" : "unreachable");
      }, CALL_RING_TIMEOUT_MS);

      expiryTimer.unref?.();
      callExpiryTimers.set(call.id, expiryTimer);

      acknowledge(ack, {
        ok: true,
        call,
      });
    },
  );

  socket.on(SOCKET_EVENTS.CALL_ACCEPT, (payload: unknown, ack?: CallAck) => {
    const parsed = callIdSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge(ack, {
        ok: false,
        error: "Invalid call",
      });
      return;
    }

    const call = calls.get(parsed.data.callId);

    if (!call || call.calleeId !== userId) {
      acknowledge(ack, {
        ok: false,
        error: "Call unavailable",
      });
      return;
    }

    call.status = "active";
    socket.join(`call:${call.id}`);

    const expiryTimer = callExpiryTimers.get(call.id);

    if (expiryTimer) {
      clearTimeout(expiryTimer);
      callExpiryTimers.delete(call.id);
    }

    participantIds(call).forEach((participantId) => {
      io.to(`user:${participantId}`).emit(SOCKET_EVENTS.CALL_ACCEPTED, call);
    });

    acknowledge(ack, {
      ok: true,
      call,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_REJECT, (payload: unknown) => {
    const parsed = callIdSchema.safeParse(payload);

    if (!parsed.success) {
      return;
    }

    const call = calls.get(parsed.data.callId);

    if (!call || call.calleeId !== userId) {
      return;
    }

    closeCall(io, call.id, "rejected");

    io.to(`user:${call.callerId}`).emit(SOCKET_EVENTS.CALL_REJECTED, {
      callId: call.id,
      byUserId: userId,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_CANCEL, (payload: unknown) => {
    const parsed = callIdSchema.safeParse(payload);

    if (!parsed.success) {
      return;
    }

    const call = calls.get(parsed.data.callId);

    if (!call || call.callerId !== userId) {
      return;
    }

    closeCall(io, call.id, "canceled");

    io.to(`user:${call.calleeId}`).emit(SOCKET_EVENTS.CALL_CANCELED, {
      callId: call.id,
      byUserId: userId,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_END, (payload: unknown) => {
    const parsed = callIdSchema.safeParse(payload);

    if (!parsed.success) {
      return;
    }

    const call = calls.get(parsed.data.callId);
    const otherParticipant = call && getOtherParticipant(call, userId);

    if (!call || !otherParticipant) {
      return;
    }

    closeCall(io, call.id, "ended");
  });

  socket.on(SOCKET_EVENTS.CALL_SIGNAL, (payload: unknown) => {
    const parsed = callSignalSchema.safeParse(payload);

    if (!parsed.success) {
      emitCallError(socket, "Invalid call signal");
      return;
    }

    const call = calls.get(parsed.data.callId);
    const targetUserId = call && getOtherParticipant(call, userId);

    if (!call || !targetUserId) {
      emitCallError(socket, "Call unavailable", parsed.data.callId);
      return;
    }

    io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CALL_SIGNAL_RELAY, {
      callId: call.id,
      fromUserId: userId,
      signal: parsed.data.signal,
    });
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    const callId = activeCallByUser.get(userId);

    if (!callId) {
      return;
    }

    const timerKey = userCallTimerKey(callId, userId);

    if (disconnectTimers.has(timerKey)) {
      return;
    }

    const timer = setTimeout(() => {
      closeCall(io, callId, "participant_disconnected");
    }, CALL_RECONNECT_GRACE_MS);

    timer.unref?.();
    disconnectTimers.set(timerKey, timer);
  });
}
