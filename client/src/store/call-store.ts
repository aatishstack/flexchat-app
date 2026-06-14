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
let remoteTrackCleanupFns: Array<() => void> = [];
let isMakingOffer = false;
let preferredFacingMode: "user" | "environment" = "user";
let callConnectTimeout: ReturnType<typeof setTimeout> | null = null;
let disconnectedIceRestartTimeout: ReturnType<typeof setTimeout> | null = null;

const CALL_CONNECT_TIMEOUT_MS = 30_000;
const DISCONNECTED_ICE_RESTART_DELAY_MS = 5_000;

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

  return iceServers;
}

function getIceTransportPolicy(): RTCIceTransportPolicy {
  return process.env.NEXT_PUBLIC_ICE_TRANSPORT_POLICY === "relay"
    ? "relay"
    : "all";
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

function snapshotStream(stream: MediaStream) {
  return new MediaStream(stream.getTracks());
}

function clearRemoteTrackListeners() {
  remoteTrackCleanupFns.forEach((cleanup) => cleanup());
  remoteTrackCleanupFns = [];
}

function addTrackOnce(stream: MediaStream, track: MediaStreamTrack) {
  const existingTrack = stream
    .getTracks()
    .find((item) => item.id === track.id);

  if (!existingTrack) {
    stream.addTrack(track);
  }
}

function closePeerConnection() {
  clearConnectionTimers();
  clearRemoteTrackListeners();

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
  if (signal.type === "offer") {
    socket.emit(SOCKET_EVENTS.CALL_OFFER, {
      callId,
      description: signal.description,
    });
    return;
  }

  if (signal.type === "answer") {
    socket.emit(SOCKET_EVENTS.CALL_ANSWER, {
      callId,
      description: signal.description,
    });
    return;
  }

  socket.emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
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
    const remoteStream = remoteMediaStream ?? new MediaStream();
    const incomingTracks = event.streams[0]?.getTracks().length
      ? event.streams[0].getTracks()
      : [event.track];

    incomingTracks.forEach((track) => {
      addTrackOnce(remoteStream, track);
    });

    remoteMediaStream = remoteStream;

    const syncRemoteStream = () => {
      if (peerConnection !== pc) {
        return;
      }

      set({
        remoteStream: snapshotStream(remoteStream),
        phase: streamHasLiveTracks(remoteStream) ? "active" : "connecting",
        networkState: "stable",
      });
    };

    if (event.track.readyState !== "ended") {
      const handleEnded = () => {
        remoteStream.removeTrack(event.track);
        syncRemoteStream();
      };
      const handleTrackStateChange = () => {
        syncRemoteStream();
      };

      event.track.addEventListener("ended", handleEnded, {
        once: true,
      });
      event.track.addEventListener("mute", handleTrackStateChange);
      event.track.addEventListener("unmute", handleTrackStateChange);
      remoteTrackCleanupFns.push(() => {
        event.track.removeEventListener("ended", handleEnded);
        event.track.removeEventListener("mute", handleTrackStateChange);
        event.track.removeEventListener("unmute", handleTrackStateChange);
      });
    }

    set({
      remoteStream: snapshotStream(remoteStream),
      phase: "active",
      networkState: "stable",
    });
  };

  pc.onconnectionstatechange = () => {
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

  peerConnection = pc;
  callConnectTimeout = setTimeout(() => {
    if (
      peerConnection !== pc ||
      pc.iceConnectionState === "connected" ||
      pc.iceConnectionState === "completed"
    ) {
      return;
    }

    socket.emit(
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

      socket.emit(
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
        socket.emit(
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
        socket.emit(
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
        socket.emit(
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
        !currentCall ||
        currentCall.id !== call.id
      ) {
        return;
      }

      if (
        currentCall?.id === call.id &&
        get().phase === "active" &&
        peerConnection &&
        peerConnection.connectionState !== "closed"
      ) {
        set({
          currentCall: call,
          modalError: null,
        });
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

      if (!call) {
        return;
      }

      if (
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

      if (!call) {
        return;
      }

      if (
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

      if (!call) {
        return;
      }

      if (
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

      if (!call) {
        return;
      }

      if (
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
