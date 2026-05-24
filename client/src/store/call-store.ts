"use client";

import { create } from "zustand";

import {
  getActiveSocket,
  getSocket,
} from "@/socket/socket";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { tokenStorage } from "@/lib/token";
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
  status: "calling" | "ringing" | "active";
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
  answerKind: CallKind | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  currentFacingMode: "user" | "environment";
  isMinimized: boolean;
  networkState: CallNetworkState;
  error: string | null;
  modalError: string | null;
  startCall: (input: StartCallInput) => Promise<void>;
  acceptIncomingCall: (answerKind?: CallKind) => Promise<void>;
  rejectIncomingCall: () => void;
  cancelOutgoingCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  minimizeCall: () => void;
  restoreCall: () => void;
  dismissCallModal: () => void;
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
let remoteMediaStream: MediaStream | null = null;
let isMakingOffer = false;
let preferredFacingMode: "user" | "environment" = "user";
let callConnectTimeout: ReturnType<typeof setTimeout> | null = null;
let disconnectedIceRestartTimeout: ReturnType<typeof setTimeout> | null = null;

const CALL_CONNECT_TIMEOUT_MS = 30_000;
const DISCONNECTED_ICE_RESTART_DELAY_MS = 5_000;
const CALL_SIGNAL_ACK_TIMEOUT_MS = 25_000;

function parseIceUrls(value?: string) {
  return (value ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

function getIceServers(): RTCIceServer[] {
  const stunUrls =
    parseIceUrls(process.env.NEXT_PUBLIC_STUN_URLS);
  const turnUrls =
    parseIceUrls(
      process.env.NEXT_PUBLIC_TURN_URLS?.trim() ||
        process.env.NEXT_PUBLIC_TURN_URL,
    );
  const iceServers: RTCIceServer[] = [
    {
      urls:
        stunUrls.length
          ? stunUrls
          : [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
            ],
    },
  ];

  if (turnUrls.length) {
    iceServers.push({
      urls: turnUrls,
      username:
        process.env.NEXT_PUBLIC_TURN_USERNAME ?? "",
      credential:
        process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "",
    });
  }

  console.info("[FlexChat Call] ICE servers configured", {
    stunCount: stunUrls.length || 2,
    turnCount: turnUrls.length,
    hasTurnCredentials: Boolean(
      process.env.NEXT_PUBLIC_TURN_USERNAME &&
        process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    ),
  });

  return iceServers;
}

function getIceTransportPolicy(): RTCIceTransportPolicy {
  return process.env.NEXT_PUBLIC_ICE_TRANSPORT_POLICY === "relay"
    ? "relay"
    : "all";
}

function getCandidateType(
  candidate?: RTCIceCandidateInit | null,
) {
  const candidateLine = candidate?.candidate ?? "";
  const match = candidateLine.match(/\btyp\s+([a-z0-9]+)/i);

  return match?.[1] ?? "unknown";
}

function clearConnectionTimers() {
  if (callConnectTimeout) {
    clearTimeout(callConnectTimeout);
    callConnectTimeout = null;
  }

  if (disconnectedIceRestartTimeout) {
    clearTimeout(disconnectedIceRestartTimeout);
    disconnectedIceRestartTimeout = null;
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function streamHasLiveTracks(stream: MediaStream | null) {
  return (
    !!stream &&
    stream.getTracks().some((track) => track.readyState === "live")
  );
}

function closePeerConnection() {
  clearConnectionTimers();

  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.close();
  }
  peerConnection = null;
  pendingIceCandidates = [];
  remoteMediaStream = null;
  isMakingOffer = false;
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
    console.info("[FlexChat Call] flushing queued ICE candidate", {
      type: getCandidateType(candidate),
    });

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
    const activeSocket = getCallSocket();

    if (!activeSocket) {
      resolve({
        ok: false,
        error: "Realtime connection is not ready",
      });
      return;
    }

    activeSocket
      .timeout(CALL_SIGNAL_ACK_TIMEOUT_MS)
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

function waitForSocketConnected() {
  const activeSocket = getCallSocket();

  if (activeSocket?.connected) {
    return Promise.resolve(true);
  }

  if (!activeSocket) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const cleanup = () => {
      activeSocket?.off("connect", handleConnect);
      activeSocket?.off("connect_error", handleConnectError);
    };

    const handleConnect = () => {
      cleanup();
      resolve(true);
    };

    const handleConnectError = () => {
      cleanup();
      resolve(false);
    };

    activeSocket.once("connect", handleConnect);
    activeSocket.once("connect_error", handleConnectError);
    activeSocket.connect();
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

function getCallSocket() {
  const activeSocket = getActiveSocket();

  if (activeSocket) {
    return activeSocket;
  }

  const token = tokenStorage.get();

  return token ? getSocket(token) : null;
}

function emitCallEvent(event: string, payload: unknown) {
  const activeSocket = getCallSocket();

  if (!activeSocket) {
    pushCallToast({
      title: "Realtime unavailable",
      message: "Please wait for FlexChat to reconnect.",
      variant: "warning",
    });
    return false;
  }

  activeSocket.emit(event, payload);
  return true;
}

function getMediaAccessFeedback(
  error: unknown,
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
      title: "Permission needed",
      message: "Please allow microphone/camera in browser settings",
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
      title: "Call device unavailable",
      message: "Connect a microphone or camera and try again.",
    };
  }

  return {
    title: "Call device unavailable",
    message: "FlexChat could not prepare your call devices.",
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
            facingMode: {
              ideal: preferredFacingMode,
            },
          }
        : false,
  });
}

function emitSignal(
  callId: string,
  signal: SignalPayload
) {
  const activeSocket = getCallSocket();

  console.info("[FlexChat Call] sending signal", {
    callId,
    type: signal.type,
    candidateType:
      signal.type === "candidate"
        ? getCandidateType(signal.candidate)
        : undefined,
    socketConnected: activeSocket?.connected ?? false,
    socketId: activeSocket?.id,
  });

  if (signal.type === "offer") {
    emitCallEvent(SOCKET_EVENTS.CALL_OFFER, {
      callId,
      description: signal.description,
    });
    return;
  }

  if (signal.type === "answer") {
    emitCallEvent(SOCKET_EVENTS.CALL_ANSWER, {
      callId,
      description: signal.description,
    });
    return;
  }

  emitCallEvent(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
    callId,
    candidate: signal.candidate,
  });
}

async function createAndSendOffer(
  call: CallSession,
  pc: RTCPeerConnection,
  options?: RTCOfferOptions
) {
  if (isMakingOffer || pc.signalingState !== "stable") {
    return;
  }

  isMakingOffer = true;

  try {
    const offer = await pc.createOffer(options);

    await pc.setLocalDescription(offer);
    emitSignal(call.id, {
      type: "offer",
      description: pc.localDescription?.toJSON() ?? offer,
    });
  } finally {
    isMakingOffer = false;
  }
}

function restartCallIce(
  call: CallSession,
  pc: RTCPeerConnection,
) {
  if (pc.connectionState === "closed") {
    return;
  }

  pc.restartIce();

  if (
    call.callerId ===
    useAuthStore.getState().user?.id
  ) {
    void createAndSendOffer(call, pc, {
      iceRestart: true,
    }).catch(() => undefined);
  }
}

async function makePeerConnection(
  call: CallSession,
  localStream: MediaStream,
  get: () => CallState,
  set: (
    partial:
      | Partial<CallState>
      | ((state: CallState) => Partial<CallState>)
  ) => void
) {
  closePeerConnection();

  const pc = new RTCPeerConnection({
    iceServers: getIceServers(),
    iceTransportPolicy: getIceTransportPolicy(),
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  });

  localStream.getTracks().forEach((track) => {
    console.info("[FlexChat Call] adding local track", {
      callId: call.id,
      kind: track.kind,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    });

    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (event) => {
    if (!event.candidate) {
      console.info("[FlexChat Call] ICE gathering candidate complete", {
        callId: call.id,
      });
      return;
    }

    console.info("[FlexChat Call] local ICE candidate", {
      callId: call.id,
      type: getCandidateType(event.candidate.toJSON()),
      protocol: event.candidate.protocol,
      address:
        event.candidate.address ??
        event.candidate.relatedAddress,
      port:
        event.candidate.port ??
        event.candidate.relatedPort,
    });

    emitSignal(call.id, {
      type: "candidate",
      candidate: event.candidate.toJSON(),
    });
  };

  pc.ontrack = (event) => {
    const remoteStream =
      event.streams[0] ??
      remoteMediaStream ??
      new MediaStream();

    if (!event.streams[0]) {
      const hasTrack = remoteStream
        .getTracks()
        .some((track) => track.id === event.track.id);

      if (!hasTrack) {
        remoteStream.addTrack(event.track);
      }
    }

    remoteMediaStream = remoteStream;

    console.info("[FlexChat Call] remote track received", {
      callId: call.id,
      kind: event.track.kind,
      enabled: event.track.enabled,
      muted: event.track.muted,
      readyState: event.track.readyState,
      streamTrackCounts: {
        audio: remoteStream.getAudioTracks().length,
        video: remoteStream.getVideoTracks().length,
      },
    });

    set({
      remoteStream,
      phase: "active",
      networkState: "stable",
    });
  };

  pc.onconnectionstatechange = () => {
    console.info("[FlexChat Call] peer connection state", {
      callId: call.id,
      state: pc.connectionState,
    });

    if (
      pc.connectionState === "connected"
    ) {
      clearConnectionTimers();
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
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.info("[FlexChat Call] ICE connection state", {
      callId: call.id,
      state: pc.iceConnectionState,
    });

    if (
      pc.iceConnectionState === "connected" ||
      pc.iceConnectionState === "completed"
    ) {
      clearConnectionTimers();
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

    if (pc.iceConnectionState === "disconnected") {
      set({
        networkState: "reconnecting",
      });

      if (!disconnectedIceRestartTimeout) {
        disconnectedIceRestartTimeout = setTimeout(() => {
          disconnectedIceRestartTimeout = null;

          if (
            pc.iceConnectionState === "disconnected"
          ) {
            restartCallIce(call, pc);
          }
        }, DISCONNECTED_ICE_RESTART_DELAY_MS);
      }

      return;
    }

    if (pc.iceConnectionState === "failed") {
      if (disconnectedIceRestartTimeout) {
        clearTimeout(disconnectedIceRestartTimeout);
        disconnectedIceRestartTimeout = null;
      }

      set({
        networkState: "reconnecting",
      });
      restartCallIce(call, pc);
    }
  };

  pc.onicegatheringstatechange = () => {
    console.info("[FlexChat Call] ICE gathering state", {
      callId: call.id,
      state: pc.iceGatheringState,
    });
  };

  pc.onsignalingstatechange = () => {
    console.info("[FlexChat Call] signaling state", {
      callId: call.id,
      state: pc.signalingState,
    });
  };

  peerConnection = pc;
  callConnectTimeout = setTimeout(() => {
    if (
      peerConnection !== pc ||
      pc.iceConnectionState === "connected" ||
      pc.iceConnectionState === "completed"
    ) {
      return;
    }

    emitCallEvent(
      SOCKET_EVENTS.CALL_END,
      {
        callId: call.id,
        reason: "timeout",
      },
    );
    pushCallToast({
      title: "Call timed out",
      message: "The call could not connect. Please try again.",
      variant: "info",
    });
    get().resetCall();
  }, CALL_CONNECT_TIMEOUT_MS);

  return pc;
}

async function prepareLocalCallMedia(
  call: CallSession,
  get: () => CallState,
  set: (
    partial:
      | Partial<CallState>
      | ((state: CallState) => Partial<CallState>)
  ) => void
) {
  let localStream = get().localStream;
  const mediaKind = get().answerKind ?? call.kind;

  if (!streamHasLiveTracks(localStream)) {
    localStream = await getLocalMedia(mediaKind);

    set({
      localStream,
      isMuted: false,
      isVideoEnabled:
        mediaKind === "video",
      currentFacingMode:
        mediaKind === "video" ? preferredFacingMode : "user",
      networkState: "connecting",
    });
  }

  if (!localStream) {
    throw new Error("Local media was not ready for this call.");
  }

  let pc = peerConnection;

  if (!pc || pc.connectionState === "closed") {
    pc = await makePeerConnection(
      call,
      localStream,
      get,
      set
    );
  }

  return {
    localStream,
    pc,
  };
}

export const useCallStore =
  create<CallState>((set, get) => ({
    currentCall: null,
    phase: "idle",
    localStream: null,
    remoteStream: null,
    answerKind: null,
    isMuted: false,
    isVideoEnabled: true,
    currentFacingMode: "user",
    isMinimized: false,
    networkState: "stable",
    error: null,
    modalError: null,

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
          modalError: null,
          isMinimized: false,
          answerKind: input.kind,
        });

        const localStream =
          await getLocalMedia(input.kind);

        set({
          localStream,
          isMuted: false,
          isVideoEnabled:
            input.kind === "video",
          currentFacingMode:
            input.kind === "video" ? preferredFacingMode : "user",
          networkState: "connecting",
        });

        const socketReady = await waitForSocketConnected();

        if (!socketReady) {
          stopStream(localStream);
          set({
            localStream: null,
            phase: "idle",
            networkState: "stable",
            error: null,
            answerKind: null,
            modalError:
              "Realtime connection is still recovering. Please try again in a moment.",
          });
          return;
        }

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
            answerKind: null,
          });
          set({
            modalError:
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
            error
          );

        set({
          currentCall: null,
          phase: "idle",
          localStream: null,
          networkState: "stable",
          error: null,
          answerKind: null,
          modalError: feedback.message,
        });
      }
    },

    acceptIncomingCall: async (answerKind) => {
      const call = get().currentCall;

      if (!call || get().phase !== "incoming") {
        return;
      }

      try {
        set({
          phase: "connecting",
          error: null,
          modalError: null,
          answerKind: answerKind ?? call.kind,
        });

        const { localStream } =
          await prepareLocalCallMedia(
            call,
            get,
            set
          );

        const socketReady = await waitForSocketConnected();

        if (!socketReady) {
          stopStream(localStream);
          closePeerConnection();
          set({
            currentCall: call,
            localStream: null,
            remoteStream: null,
            phase: "incoming",
            networkState: "reconnecting",
            error:
              "Realtime connection is still recovering. Please try again in a moment.",
            answerKind: null,
          });
          return;
        }

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
            answerKind: null,
          });
          set({
            modalError:
              ack.error ??
              "Please try again in a moment.",
          });
        }
      } catch (error) {
        const feedback =
          getMediaAccessFeedback(
            error
          );

        closePeerConnection();
        set({
          currentCall: call,
          localStream: null,
          remoteStream: null,
          phase: "incoming",
          networkState: "stable",
          error:
            "Permission is needed before joining. Allow access, then tap answer again.",
          answerKind: null,
          modalError: feedback.message,
        });
      }
    },

    rejectIncomingCall: () => {
      const call = get().currentCall;

      if (!call) {
        return;
      }

      emitCallEvent(
        SOCKET_EVENTS.CALL_END,
        {
          callId: call.id,
          reason: "declined",
        }
      );

      get().resetCall();
    },

    cancelOutgoingCall: () => {
      const call = get().currentCall;

      if (call) {
        emitCallEvent(
          SOCKET_EVENTS.CALL_END,
          {
            callId: call.id,
            reason: "canceled",
          }
        );
      }

      get().resetCall();
    },

    endCall: () => {
      const call = get().currentCall;

      if (call) {
        emitCallEvent(
          SOCKET_EVENTS.CALL_END,
          {
            callId: call.id,
            reason: "ended",
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

    switchCamera: async () => {
      const call = get().currentCall;
      const localStream = get().localStream;

      if (!call || call.kind !== "video" || !localStream) {
        return;
      }

      preferredFacingMode =
        preferredFacingMode === "user" ? "environment" : "user";

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
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
            facingMode: {
              ideal: preferredFacingMode,
            },
          },
        });
        const nextVideoTrack = nextStream.getVideoTracks()[0];

        if (!nextVideoTrack) {
          stopStream(nextStream);
          preferredFacingMode =
            preferredFacingMode === "user" ? "environment" : "user";
          return;
        }

        const sender = peerConnection
          ?.getSenders()
          .find((item) => item.track?.kind === "video");

        await sender?.replaceTrack(nextVideoTrack);

        localStream.getVideoTracks().forEach((track) => {
          track.stop();
          localStream.removeTrack(track);
        });
        localStream.addTrack(nextVideoTrack);

        set({
          localStream: new MediaStream(localStream.getTracks()),
          isVideoEnabled: true,
          currentFacingMode: preferredFacingMode,
          error: null,
        });
      } catch (error) {
        preferredFacingMode =
          preferredFacingMode === "user" ? "environment" : "user";
        pushCallToast({
          title: "Camera switch failed",
          message:
            error instanceof Error
              ? error.message
              : "Please try again in a moment.",
          variant: "warning",
        });
      }
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
        emitCallEvent(
          SOCKET_EVENTS.CALL_END,
          {
            callId: call.id,
            reason: "busy",
          }
        );
        return;
      }

      navigator.vibrate?.([240, 120, 240, 120, 360]);

      set({
        currentCall: call,
        phase: "incoming",
        isMinimized: false,
        error: null,
        networkState: "connecting",
        answerKind: null,
      });
    },

    handleCallAccepted: (call) => {
      const currentCall =
        get().currentCall;

      if (
        currentCall &&
        currentCall.id !== call.id
      ) {
        return;
      }

        set({
          currentCall: call,
          phase: "connecting",
          error: null,
          networkState: "connecting",
          modalError: null,
        });

      void (async () => {
        const { pc } =
          await prepareLocalCallMedia(
            call,
            get,
            set
          );

        if (
          call.callerId ===
          useAuthStore.getState().user?.id
        ) {
          await createAndSendOffer(call, pc);
        }
      })().catch((error) => {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Unable to prepare call",
          modalError:
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

      if (
        payload.reason === "unreachable" ||
        payload.reason === "missed" ||
        payload.reason === "declined" ||
        payload.reason === "participant_disconnected"
      ) {
        pushCallToast({
          title:
            payload.reason === "unreachable"
              ? "User unreachable"
              : payload.reason === "missed"
                ? "Call missed"
                : payload.reason === "declined"
                  ? "Call declined"
                  : "Call disconnected",
          message:
            payload.reason === "unreachable"
              ? "The other person is not reachable right now."
              : undefined,
          variant: "info",
        });
      }
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
        console.info("[FlexChat Call] received signal", {
          callId: call.id,
          type: signal.type,
          candidateType:
            signal.type === "candidate"
              ? getCandidateType(signal.candidate)
              : undefined,
          signalingState:
            peerConnection?.signalingState,
          iceConnectionState:
            peerConnection?.iceConnectionState,
        });

        if (
          signal.type === "offer" &&
          signal.description
        ) {
          const { pc } =
            await prepareLocalCallMedia(
              call,
              get,
              set
            );

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
            console.info("[FlexChat Call] queued remote ICE candidate", {
              callId: call.id,
              type: getCandidateType(signal.candidate),
            });
            pendingIceCandidates.push(
              signal.candidate
            );
            return;
          }

          console.info("[FlexChat Call] adding remote ICE candidate", {
            callId: call.id,
            type: getCandidateType(signal.candidate),
          });

          await peerConnection.addIceCandidate(
            signal.candidate
          );
        }
      })().catch((error) => {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Call signal failed",
          modalError:
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
        modalError:
          payload.message ??
          "Call connection issue",
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
        answerKind: null,
        isMuted: false,
        isVideoEnabled: true,
        currentFacingMode: "user",
        isMinimized: false,
        networkState: "stable",
        error: null,
        modalError: null,
      });
    },

    dismissCallModal: () =>
      set({
        modalError: null,
      }),
  }));
