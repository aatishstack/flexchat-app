import type { Server, Socket } from "socket.io";

import { z } from "zod";

import {
  getConversationMembers,
  isConversationMember,
} from "../../lib/conversation-access.js";
import { debugLog } from "../../lib/debug-log.js";
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

const callEndSchema = z.object({
  callId: z.string().trim().min(1).max(128),
  reason: z.string().trim().max(64).optional(),
});

const rtcDescriptionSchema = z.object({
  type: z.enum(["offer", "answer", "pranswer", "rollback"]),
  sdp: z.string().max(128_000).optional(),
});

const callDescriptionSchema = z.object({
  callId: z.string().trim().min(1).max(128),
  description: rtcDescriptionSchema,
});

const rtcCandidateSchema = z.object({
  candidate: z.string().max(8_192),
  sdpMid: z.string().max(256).nullable().optional(),
  sdpMLineIndex: z.number().int().min(0).max(65_535).nullable().optional(),
  usernameFragment: z.string().max(256).nullable().optional(),
});

const callCandidateSchema = z.object({
  callId: z.string().trim().min(1).max(128),
  candidate: rtcCandidateSchema,
});

const calls = new Map<string, CallSession>();
const activeCallByUser = new Map<string, string>();
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const callExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

const CALL_RECONNECT_GRACE_MS = 60_000;
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
  console.warn("[FlexChat Call] signaling error", {
    socketId: socket.id,
    userId: socket.data.user.id,
    callId,
    message,
  });

  socket.emit(SOCKET_EVENTS.CALL_ERROR, {
    callId,
    message,
  });
}

function getCandidateType(candidate: unknown) {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !("candidate" in candidate)
  ) {
    return "unknown";
  }

  const candidateLine =
    typeof candidate.candidate === "string"
      ? candidate.candidate
      : "";
  const match = candidateLine.match(/\btyp\s+([a-z0-9]+)/i);

  return match?.[1] ?? "unknown";
}

function relayCallPayload(
  socket: Socket,
  callId: string,
  event:
    | typeof SOCKET_EVENTS.CALL_OFFER
    | typeof SOCKET_EVENTS.CALL_ANSWER
    | typeof SOCKET_EVENTS.CALL_ICE_CANDIDATE,
  payload: Record<string, unknown>,
) {
  const call = calls.get(callId);
  const targetUserId = call && getOtherParticipant(call, socket.data.user.id);

  if (!call || !targetUserId) {
    emitCallError(socket, "Call unavailable", callId);
    return;
  }

  debugLog("[FlexChat Call] relaying signal", {
    callId,
    fromUserId: socket.data.user.id,
    targetUserId,
    event,
    candidateType:
      event === SOCKET_EVENTS.CALL_ICE_CANDIDATE
        ? getCandidateType(payload.candidate)
        : undefined,
    transport: socket.conn.transport.name,
  });

  socket.to(`user:${targetUserId}`).emit(event, {
    callId: call.id,
    fromUserId: socket.data.user.id,
    ...payload,
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
      socket.emit(SOCKET_EVENTS.CALL_ACCEPTED, activeCall);
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

      debugLog("[FlexChat Call] invite received", {
        socketId: socket.id,
        callerId: userId,
        targetUserId,
        conversationId,
        kind,
        transport: socket.conn.transport.name,
      });

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

      debugLog("[FlexChat Call] invite created", {
        callId: call.id,
        callerId: userId,
        targetUserId,
        targetOnline,
      });

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

    debugLog("[FlexChat Call] accepted", {
      callId: call.id,
      calleeId: userId,
      transport: socket.conn.transport.name,
    });

    const expiryTimer = callExpiryTimers.get(call.id);

    if (expiryTimer) {
      clearTimeout(expiryTimer);
      callExpiryTimers.delete(call.id);
    }

    io.to(`user:${call.callerId}`).emit(SOCKET_EVENTS.CALL_ACCEPTED, call);
    socket.emit(SOCKET_EVENTS.CALL_ACCEPTED, call);
    socket.to(`user:${call.calleeId}`).emit(SOCKET_EVENTS.CALL_ENDED, {
      callId: call.id,
      reason: "answered_elsewhere",
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
    const parsed = callEndSchema.safeParse(payload);

    if (!parsed.success) {
      return;
    }

    const call = calls.get(parsed.data.callId);
    const otherParticipant = call && getOtherParticipant(call, userId);

    if (!call || !otherParticipant) {
      return;
    }

    closeCall(io, call.id, parsed.data.reason ?? "ended");
  });

  socket.on(SOCKET_EVENTS.CALL_OFFER, (payload: unknown) => {
    const parsed = callDescriptionSchema.safeParse(payload);

    if (!parsed.success) {
      emitCallError(socket, "Invalid call offer");
      return;
    }

    debugLog("[FlexChat Call] offer received", {
      callId: parsed.data.callId,
      fromUserId: userId,
      transport: socket.conn.transport.name,
    });

    relayCallPayload(socket, parsed.data.callId, SOCKET_EVENTS.CALL_OFFER, {
      description: parsed.data.description,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_ANSWER, (payload: unknown) => {
    const parsed = callDescriptionSchema.safeParse(payload);

    if (!parsed.success) {
      emitCallError(socket, "Invalid call answer");
      return;
    }

    debugLog("[FlexChat Call] answer received", {
      callId: parsed.data.callId,
      fromUserId: userId,
      transport: socket.conn.transport.name,
    });

    const call = calls.get(parsed.data.callId);

    if (call && getOtherParticipant(call, userId)) {
      call.status = "active";
    }

    relayCallPayload(socket, parsed.data.callId, SOCKET_EVENTS.CALL_ANSWER, {
      description: parsed.data.description,
    });
  });

  socket.on(SOCKET_EVENTS.CALL_ICE_CANDIDATE, (payload: unknown) => {
    const parsed = callCandidateSchema.safeParse(payload);

    if (!parsed.success) {
      emitCallError(socket, "Invalid ICE candidate");
      return;
    }

    debugLog("[FlexChat Call] ICE candidate received", {
      callId: parsed.data.callId,
      fromUserId: userId,
      candidateType: getCandidateType(parsed.data.candidate),
      transport: socket.conn.transport.name,
    });

    relayCallPayload(
      socket,
      parsed.data.callId,
      SOCKET_EVENTS.CALL_ICE_CANDIDATE,
      {
        candidate: parsed.data.candidate,
      },
    );
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    const callId = activeCallByUser.get(userId);

    if (!callId) {
      return;
    }

    void io
      .in(`user:${userId}`)
      .allSockets()
      .then((activeSocketIds) => {
        if (
          activeSocketIds.size ||
          activeCallByUser.get(userId) !== callId ||
          !calls.has(callId)
        ) {
          return;
        }

        const timerKey = userCallTimerKey(callId, userId);

        if (disconnectTimers.has(timerKey)) {
          return;
        }

        const timer = setTimeout(() => {
          console.warn("[FlexChat Call] participant reconnect grace expired", {
            callId,
            userId,
          });

          closeCall(io, callId, "participant_disconnected");
        }, CALL_RECONNECT_GRACE_MS);

        timer.unref?.();
        disconnectTimers.set(timerKey, timer);
      })
      .catch((error) => {
        console.error("[FlexChat Call] failed to inspect active sockets", {
          callId,
          userId,
          error,
        });
      });
  });
}
