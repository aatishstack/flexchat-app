"use client";

import { create } from "zustand";

import { socket } from "@/socket/socket";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";

export type CallKind = "voice" | "video";

export type CallPhase =
  | "idle"
  | "incoming"
  | "outgoing"
  | "connecting"
  | "active";

export type CallNetworkState =
  | "stable"
  | "connecting"
  | "reconnecting";

export interface CallSession {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  kind: CallKind;
  status: "ringing" | "active";
  startedAt: string;
}

type CallAck = {
  ok: boolean;
  error?: string;
  call?: CallSession;
};

type SignalPayload = {
  type: "offer" | "answer" | "candidate";
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

interface StartCallInput {
  conversationId: string;
  targetUserId: string;
  kind: CallKind;
}

interface CallState {
  currentCall: CallSession | null;
  phase: CallPhase;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isMinimized: boolean;
  networkState: CallNetworkState;
  error: string | null;
  startCall: (input: StartCallInput) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  cancelOutgoingCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  minimizeCall: () => void;
  restoreCall: () => void;
  handleIncomingCall: (call: CallSession) => void;
  handleCallAccepted: (call: CallSession) => void;
  handleCallRejected: (payload: { callId?: string }) => void;
  handleCallCanceled: (payload: { callId?: string }) => void;
  handleCallEnded: (payload: { callId?: string; reason?: string }) => void;
  handleCallSignal: (payload: {
    callId?: string;
    signal?: SignalPayload;
  }) => void;
  handleCallError: (payload: {
    callId?: string;
    message?: string;
  }) => void;
  resetCall: () => void;
}

let peerConnection: RTCPeerConnection | null = null;
let pendingIceCandidates: RTCIceCandidateInit[] = [];

function getIceServers(): RTCIceServer[] {
  const stunUrls =
    process.env.NEXT_PUBLIC_STUN_URLS?.split(",")
      .map((url) => url.trim())
      .filter(Boolean) ?? [
      "stun:stun.l.google.com:19302",
      "stun:global.stun.twilio.com:3478",
    ];
  const turnUrls =
    process.env.NEXT_PUBLIC_TURN_URLS?.split(",")
      .map((url) => url.trim())
      .filter(Boolean) ?? [];
  const turnUsername =
    process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential =
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  const iceServers: RTCIceServer[] = [
    {
      urls: stunUrls,
    },
  ];

  if (
    turnUrls.length &&
    turnUsername &&
    turnCredential
  ) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function closePeerConnection() {
  peerConnection?.getSenders().forEach((sender) => {
    sender.track?.stop();
  });
  peerConnection?.close();
  peerConnection = null;
  pendingIceCandidates = [];
}

async function flushPendingIceCandidates() {
  if (
    !peerConnection?.remoteDescription ||
    !pendingIceCandidates.length
  ) {
    return;
  }

  const candidates = pendingIceCandidates;
  pendingIceCandidates = [];

  for (const candidate of candidates) {
    await peerConnection.addIceCandidate(
      candidate
    );
  }
}

function emitCallWithAck(
  event: string,
  payload: unknown
) {
  return new Promise<CallAck>((resolve) => {
    socket
      .timeout(12000)
      .emit(
        event,
        payload,
        (
          error: Error | null,
          ack?: CallAck
        ) => {
          if (error) {
            resolve({
              ok: false,
              error: error.message,
            });
            return;
          }

          resolve(
            ack ?? {
              ok: false,
              error:
                "Call request was not acknowledged",
            }
          );
        }
      );
  });
}

function pushCallToast({
  title,
  message,
  variant = "error",
}: {
  title: string;
  message?: string;
  variant?: "error" | "info" | "warning";
}) {
  useToastStore.getState().pushToast({
    title,
    message,
    variant,
    durationMs: 3000,
  });
}

function getMediaAccessFeedback(
  error: unknown,
  kind: CallKind
) {
  const errorName =
    error instanceof Error
      ? error.name
      : "";
  const errorMessage =
    error instanceof Error
      ? error.message
      : "";
  const normalizedError =
    `${errorName} ${errorMessage}`.toLowerCase();
  const denied =
    normalizedError.includes(
      "notallowed"
    ) ||
    normalizedError.includes(
      "permission"
    ) ||
    normalizedError.includes(
      "denied"
    ) ||
    normalizedError.includes(
      "security"
    );

  if (denied) {
    return {
      title:
        kind === "video"
          ? "Camera access denied"
          : "Microphone access denied",
      message:
        "Check your browser and system privacy settings.",
    };
  }

  if (
    normalizedError.includes(
      "notfound"
    ) ||
    normalizedError.includes(
      "device"
    )
  ) {
    return {
      title:
        kind === "video"
          ? "Camera unavailable"
          : "Microphone unavailable",
      message:
        "Connect a device and try the call again.",
    };
  }

  return {
    title:
      kind === "video"
        ? "Camera or microphone unavailable"
        : "Microphone unavailable",
    message:
      "FlexChat could not prepare your call devices.",
  };
}

async function getLocalMedia(kind: CallKind) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Media devices are not available in this browser"
    );
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video:
      kind === "video"
        ? {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            frameRate: {
              ideal: 30,
              max: 30,
            },
          }
        : false,
  });
}

function emitSignal(
  callId: string,
  signal: SignalPayload
) {
  socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
    callId,
    signal,
  });
}

async function makePeerConnection(
  call: CallSession,
  localStream: MediaStream,
  set: (
    partial:
      | Partial<CallState>
      | ((state: CallState) => Partial<CallState>)
  ) => void
) {
  closePeerConnection();

  const pc = new RTCPeerConnection({
    iceServers: getIceServers(),
    bundlePolicy: "balanced",
  });

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (event) => {
    if (!event.candidate) {
      return;
    }

    emitSignal(call.id, {
      type: "candidate",
      candidate: event.candidate.toJSON(),
    });
  };

  pc.ontrack = (event) => {
    const [remoteStream] = event.streams;

    if (remoteStream) {
      set({
        remoteStream,
        phase: "active",
        networkState: "stable",
      });
    }
  };

  pc.onconnectionstatechange = () => {
    if (
      pc.connectionState === "connected"
    ) {
      set({
        phase: "active",
        networkState: "stable",
        error: null,
      });
      return;
    }

    if (
      pc.connectionState === "connecting"
    ) {
      set({
        networkState: "connecting",
      });
      return;
    }

    if (
      pc.connectionState === "disconnected" ||
      pc.connectionState === "failed"
    ) {
      set({
        networkState: "reconnecting",
      });

      if (pc.connectionState === "failed") {
        pc.restartIce();
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (
      pc.iceConnectionState === "connected" ||
      pc.iceConnectionState === "completed"
    ) {
      set({
        networkState: "stable",
        error: null,
      });
      return;
    }

    if (
      pc.iceConnectionState === "checking"
    ) {
      set({
        networkState: "connecting",
      });
      return;
    }

    if (
      pc.iceConnectionState === "disconnected" ||
      pc.iceConnectionState === "failed"
    ) {
      set({
        networkState: "reconnecting",
      });

      if (pc.iceConnectionState === "failed") {
        pc.restartIce();
      }
    }
  };

  peerConnection = pc;

  return pc;
}

export const useCallStore =
  create<CallState>((set, get) => ({
    currentCall: null,
    phase: "idle",
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoEnabled: true,
    isMinimized: false,
    networkState: "stable",
    error: null,

    startCall: async (input) => {
      if (get().currentCall) {
        pushCallToast({
          title: "Call already active",
          message:
            "Finish the current call before starting another one.",
          variant: "warning",
        });
        set({
          error: null,
        });
        return;
      }

      try {
        set({
          phase: "connecting",
          error: null,
          isMinimized: false,
        });

        const localStream =
          await getLocalMedia(input.kind);

        set({
          localStream,
          isMuted: false,
          isVideoEnabled:
            input.kind === "video",
          networkState: "connecting",
        });

        const ack =
          await emitCallWithAck(
            SOCKET_EVENTS.CALL_INVITE,
            input
          );

        if (!ack.ok || !ack.call) {
          stopStream(localStream);
          set({
            localStream: null,
            phase: "idle",
            networkState: "stable",
            error: null,
          });
          pushCallToast({
            title: "Unable to start call",
            message:
              ack.error ??
              "Please try again in a moment.",
          });
          return;
        }

        set({
          currentCall: ack.call,
          phase: "outgoing",
          networkState: "connecting",
        });
      } catch (error) {
        const feedback =
          getMediaAccessFeedback(
            error,
            input.kind
          );

        set({
          currentCall: null,
          phase: "idle",
          localStream: null,
          networkState: "stable",
          error: null,
        });
        pushCallToast(feedback);
      }
    },

    acceptIncomingCall: async () => {
      const call = get().currentCall;

      if (!call || get().phase !== "incoming") {
        return;
      }

      try {
        set({
          phase: "connecting",
          error: null,
        });

        const localStream =
          await getLocalMedia(call.kind);

        await makePeerConnection(
          call,
          localStream,
          set
        );

        set({
          localStream,
          isMuted: false,
          isVideoEnabled:
            call.kind === "video",
          networkState: "connecting",
        });

        const ack =
          await emitCallWithAck(
            SOCKET_EVENTS.CALL_ACCEPT,
            {
              callId: call.id,
            }
          );

        if (!ack.ok) {
          stopStream(localStream);
          closePeerConnection();
          set({
            currentCall: null,
            localStream: null,
            remoteStream: null,
            phase: "idle",
            networkState: "stable",
            error: null,
          });
          pushCallToast({
            title: "Unable to accept call",
            message:
              ack.error ??
              "Please try again in a moment.",
          });
        }
      } catch (error) {
        socket.emit(
          SOCKET_EVENTS.CALL_REJECT,
          {
            callId: call.id,
          }
        );
        stopStream(get().localStream);
        closePeerConnection();
        set({
          currentCall: null,
          localStream: null,
          remoteStream: null,
          phase: "idle",
          networkState: "stable",
          error: null,
        });
        pushCallToast(
          getMediaAccessFeedback(
            error,
            call.kind
          )
        );
      }
    },

    rejectIncomingCall: () => {
      const call = get().currentCall;

      if (!call) {
        return;
      }

      socket.emit(
        SOCKET_EVENTS.CALL_REJECT,
        {
          callId: call.id,
        }
      );

      get().resetCall();
    },

    cancelOutgoingCall: () => {
      const call = get().currentCall;

      if (call) {
        socket.emit(
          SOCKET_EVENTS.CALL_CANCEL,
          {
            callId: call.id,
          }
        );
      }

      get().resetCall();
    },

    endCall: () => {
      const call = get().currentCall;

      if (call) {
        socket.emit(
          SOCKET_EVENTS.CALL_END,
          {
            callId: call.id,
          }
        );
      }

      get().resetCall();
    },

    toggleMute: () => {
      const nextMuted =
        !get().isMuted;

      get()
        .localStream?.getAudioTracks()
        .forEach((track) => {
          track.enabled = !nextMuted;
        });

      set({
        isMuted: nextMuted,
      });
    },

    toggleVideo: () => {
      const nextVideoEnabled =
        !get().isVideoEnabled;

      get()
        .localStream?.getVideoTracks()
        .forEach((track) => {
          track.enabled =
            nextVideoEnabled;
        });

      set({
        isVideoEnabled:
          nextVideoEnabled,
      });
    },

    minimizeCall: () =>
      set({
        isMinimized: true,
      }),

    restoreCall: () =>
      set({
        isMinimized: false,
      }),

    handleIncomingCall: (call) => {
      if (get().currentCall) {
        socket.emit(
          SOCKET_EVENTS.CALL_REJECT,
          {
            callId: call.id,
          }
        );
        return;
      }

      set({
        currentCall: call,
        phase: "incoming",
        isMinimized: false,
        error: null,
        networkState: "connecting",
      });
    },

    handleCallAccepted: (call) => {
      const currentCall =
        get().currentCall;

      if (
        !currentCall ||
        currentCall.id !== call.id
      ) {
        set({
          currentCall: call,
          phase: "connecting",
          error: null,
          networkState: "connecting",
        });
        return;
      }

      set({
        currentCall: call,
        phase: "connecting",
        error: null,
        networkState: "connecting",
      });

      if (
        call.callerId !==
        useAuthStore.getState().user?.id
      ) {
        return;
      }

      const localStream =
        get().localStream;

      if (!localStream) {
        pushCallToast({
          title: "Call media unavailable",
          message:
            "Local media was not ready for this call.",
        });
        set({
          error:
            "Local media was not ready for this call",
        });
        return;
      }

      void (async () => {
        const pc =
          await makePeerConnection(
            call,
            localStream,
            set
          );
        const offer =
          await pc.createOffer();

        await pc.setLocalDescription(offer);
        emitSignal(call.id, {
          type: "offer",
          description: offer,
        });
      })().catch((error) => {
        pushCallToast({
          title: "Unable to prepare call",
          message:
            error instanceof Error
              ? error.message
              : "Please try again in a moment.",
        });
        set({
          error:
            error instanceof Error
              ? error.message
              : "Unable to prepare call",
        });
      });
    },

    handleCallRejected: (payload) => {
      const call = get().currentCall;

      if (
        call &&
        payload.callId &&
        call.id !== payload.callId
      ) {
        return;
      }

      get().resetCall();
      set({
        error: null,
      });
      pushCallToast({
        title: "Call declined",
        variant: "info",
      });
    },

    handleCallCanceled: (payload) => {
      const call = get().currentCall;

      if (
        call &&
        payload.callId &&
        call.id !== payload.callId
      ) {
        return;
      }

      get().resetCall();
      set({
        error: null,
      });
      pushCallToast({
        title: "Call canceled",
        variant: "info",
      });
    },

    handleCallEnded: (payload) => {
      const call = get().currentCall;

      if (
        call &&
        payload.callId &&
        call.id !== payload.callId
      ) {
        return;
      }

      get().resetCall();
    },

    handleCallSignal: (payload) => {
      const call = get().currentCall;
      const signal = payload.signal;

      if (
        !call ||
        !signal ||
        payload.callId !== call.id
      ) {
        return;
      }

      void (async () => {
        if (
          signal.type === "offer" &&
          signal.description
        ) {
          const pc =
            peerConnection ??
            (get().localStream
              ? await makePeerConnection(
                  call,
                  get().localStream as MediaStream,
                  set
                )
              : null);

          if (!pc) {
            throw new Error(
              "Local media was not ready for the incoming offer"
            );
          }

          await pc.setRemoteDescription(
            signal.description
          );
          await flushPendingIceCandidates();

          const answer =
            await pc.createAnswer();

          await pc.setLocalDescription(answer);
          emitSignal(call.id, {
            type: "answer",
            description: answer,
          });
          set({
            phase: "connecting",
          });
          return;
        }

        if (
          signal.type === "answer" &&
          signal.description &&
          peerConnection
        ) {
          await peerConnection.setRemoteDescription(
            signal.description
          );
          await flushPendingIceCandidates();
          set({
            phase: "connecting",
          });
          return;
        }

        if (
          signal.type === "candidate" &&
          signal.candidate
        ) {
          if (!peerConnection?.remoteDescription) {
            pendingIceCandidates.push(
              signal.candidate
            );
            return;
          }

          await peerConnection.addIceCandidate(
            signal.candidate
          );
        }
      })().catch((error) => {
        pushCallToast({
          title: "Call connection issue",
          message:
            error instanceof Error
              ? error.message
              : "FlexChat is reconnecting the call.",
          variant: "warning",
        });
        set({
          error:
            error instanceof Error
              ? error.message
              : "Call signal failed",
          networkState: "reconnecting",
        });
      });
    },

    handleCallError: (payload) => {
      const call = get().currentCall;

      if (
        call &&
        payload.callId &&
        call.id !== payload.callId
      ) {
        return;
      }

      set({
        error:
          payload.message ??
          "Call connection issue",
      });
      pushCallToast({
        title: "Call connection issue",
        message:
          payload.message ??
          "FlexChat is reconnecting the call.",
        variant: "warning",
      });
    },

    resetCall: () => {
      stopStream(get().localStream);
      stopStream(get().remoteStream);
      closePeerConnection();

      set({
        currentCall: null,
        phase: "idle",
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoEnabled: true,
        isMinimized: false,
        networkState: "stable",
        error: null,
      });
    },
  }));
