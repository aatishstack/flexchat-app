"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  SwitchCamera,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import FlexAvatar from "@/components/chat/flex-avatar";
import { useUsersByIdsQuery } from "@/hooks/queries/use-users-query";
import { useCallStore } from "@/store/call-store";
import { useAuthStore } from "@/stores/auth.store";

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function StreamVideo({
  stream,
  muted,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
}

function CallErrorModal() {
  const modalError = useCallStore((state) => state.modalError);
  const dismissCallModal = useCallStore((state) => state.dismissCallModal);

  return (
    <AnimatePresence>
      {modalError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-5 text-white backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: 18, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 18, scale: 0.96 }}
            className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0B111C]/95 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Call unavailable</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {modalError}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissCallModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/15"
                aria-label="Close call message"
              >
                <X size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={dismissCallModal}
              className="mt-5 h-12 w-full rounded-2xl bg-cyan-500 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:bg-cyan-400"
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function IncomingCallOverlay({
  name,
  avatar,
  isVideoCall,
  onAccept,
  onAcceptAudioOnly,
  onDecline,
}: {
  name: string;
  avatar?: string | null;
  isVideoCall: boolean;
  onAccept: () => void;
  onAcceptAudioOnly: () => void;
  onDecline: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDecline, 30_000);

    return () => window.clearTimeout(timer);
  }, [onDecline]);

  useEffect(() => {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const ctx = new AudioContextCtor();
    let activeOscillator: OscillatorNode | null = null;
    let activeGain: GainNode | null = null;

    const ring = () => {
      activeOscillator?.stop();
      activeOscillator?.disconnect();
      activeGain?.disconnect();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = 440;
      gain.gain.value = 0.07;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      activeOscillator = osc;
      activeGain = gain;

      window.setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, 650);
    };

    void ctx.resume().catch(() => undefined);
    ring();
    const interval = window.setInterval(ring, 2000);

    return () => {
      window.clearInterval(interval);
      activeOscillator?.stop();
      activeOscillator?.disconnect();
      activeGain?.disconnect();
      void ctx.close().catch(() => undefined);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#07111f]/95 px-6 text-white backdrop-blur-2xl"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative">
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.45], opacity: [0.36, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-cyan-300"
          />
          <FlexAvatar
            src={avatar}
            name={name}
            className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-3xl font-bold shadow-[0_22px_70px_rgba(6,182,212,0.32)]"
          />
        </div>

        <h2 className="mt-7 text-2xl font-semibold">{name}</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Incoming {isVideoCall ? "Video" : "Voice"} Call
        </p>

        <div className="mt-9 flex items-center justify-center gap-7">
          <button
            type="button"
            onClick={onDecline}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl shadow-red-500/30 transition hover:scale-105"
            aria-label="Decline call"
          >
            <PhoneOff size={26} />
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl shadow-green-500/30 transition hover:scale-105"
            aria-label="Accept call"
          >
            {isVideoCall ? <Video size={26} /> : <Phone size={26} />}
          </button>
        </div>

        {isVideoCall ? (
          <button
            type="button"
            onClick={onAcceptAudioOnly}
            className="mt-6 rounded-full bg-white/[0.12] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.18]"
          >
            Accept as Audio Only
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

function CallScreen({
  name,
  avatar,
  elapsedSeconds,
}: {
  name: string;
  avatar?: string | null;
  elapsedSeconds: number;
}) {
  const {
    currentCall,
    phase,
    localStream,
    remoteStream,
    answerKind,
    isMuted,
    isVideoEnabled,
    networkState,
    toggleMute,
    toggleVideo,
    switchCamera,
    endCall,
    cancelOutgoingCall,
  } = useCallStore();
  const [selfPosition, setSelfPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [, forceTrackUpdate] = useState(0);
  const isVideoCall = currentCall?.kind === "video" && answerKind !== "voice";
  const remoteVideoTrack = remoteStream?.getVideoTracks()[0] ?? null;
  const hasRemoteVideo =
    isVideoCall &&
    !!remoteVideoTrack &&
    remoteVideoTrack.enabled &&
    remoteVideoTrack.readyState === "live";
  const hasSelfVideo =
    isVideoCall && !!localStream?.getVideoTracks().length;

  useEffect(() => {
    if (selfPosition || typeof window === "undefined") {
      return;
    }

    setSelfPosition({
      x: Math.max(16, window.innerWidth - 140),
      y: Math.max(16, window.innerHeight - 220),
    });
  }, [selfPosition]);

  useEffect(() => {
    if (!remoteVideoTrack) {
      return;
    }

    const update = () => forceTrackUpdate((count) => count + 1);

    remoteVideoTrack.addEventListener("mute", update);
    remoteVideoTrack.addEventListener("unmute", update);
    remoteVideoTrack.addEventListener("ended", update);

    return () => {
      remoteVideoTrack.removeEventListener("mute", update);
      remoteVideoTrack.removeEventListener("unmute", update);
      remoteVideoTrack.removeEventListener("ended", update);
    };
  }, [remoteVideoTrack]);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setSelfPosition({
      x: Math.min(
        window.innerWidth - 136,
        Math.max(16, event.clientX - drag.offsetX),
      ),
      y: Math.min(
        window.innerHeight - 196,
        Math.max(16, event.clientY - drag.offsetY),
      ),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  }

  const controlClass =
    "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-105 active:scale-95";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-[#1a1a1a] text-white"
    >
      {hasRemoteVideo ? (
        <StreamVideo
          stream={remoteStream}
          className="fixed inset-0 h-full w-full bg-black object-cover"
        />
      ) : (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]">
          <FlexAvatar
            src={avatar}
            name={name}
            className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-5xl font-bold shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
          />
          <h2 className="mt-7 text-2xl font-semibold">{name}</h2>
        </div>
      )}

      {hasSelfVideo && selfPosition ? (
        <div
          role="presentation"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="fixed z-20 overflow-hidden border border-white/20 bg-black shadow-2xl touch-none"
          style={{
            left: selfPosition.x,
            top: selfPosition.y,
            width: 120,
            height: 180,
            borderRadius: 12,
          }}
        >
          <StreamVideo
            stream={localStream}
            muted
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/70 to-transparent px-5 pb-12 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{name}</h2>
            <p className="text-sm text-white/70">
              {phase === "active"
                ? formatElapsed(elapsedSeconds)
                : phase === "outgoing"
                  ? "Calling"
                  : networkState === "reconnecting"
                    ? "Reconnecting"
                    : "Connecting"}
            </p>
          </div>
          <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs text-white/75 backdrop-blur-xl">
            {networkState === "reconnecting" ? "Reconnecting" : "HD stable"}
          </span>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 to-transparent px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-20">
        <div className="mx-auto flex max-w-sm items-center justify-center gap-4">
          <button
            type="button"
            onClick={toggleMute}
            className={`${controlClass} ${isMuted ? "bg-red-500" : "bg-white/[0.14]"}`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={23} /> : <Mic size={23} />}
          </button>

          {isVideoCall ? (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`${controlClass} ${
                  isVideoEnabled ? "bg-white/[0.14]" : "bg-red-500"
                }`}
                aria-label={isVideoEnabled ? "Turn camera off" : "Turn camera on"}
              >
                {isVideoEnabled ? <Video size={23} /> : <VideoOff size={23} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  void switchCamera();
                }}
                className={`${controlClass} bg-white/[0.14]`}
                aria-label="Flip camera"
              >
                <SwitchCamera size={22} />
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={phase === "outgoing" ? cancelOutgoingCall : endCall}
            className={`${controlClass} bg-red-500 shadow-red-500/30`}
            aria-label="End call"
          >
            <PhoneOff size={25} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function CallLayer() {
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const {
    currentCall,
    phase,
    answerKind,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useCallStore();
  const callActive = phase !== "idle" && !!currentCall;

  const remoteUserId = useMemo(() => {
    if (!currentCall || !currentUserId) {
      return "";
    }

    return currentCall.callerId === currentUserId
      ? currentCall.calleeId
      : currentCall.callerId;
  }, [currentCall, currentUserId]);

  const usersQuery = useUsersByIdsQuery(remoteUserId ? [remoteUserId] : []);
  const remoteUser = usersQuery.data?.[0];
  const remoteName = remoteUser?.username ?? "FlexChat call";
  const isVideoCall = currentCall?.kind === "video" && answerKind !== "voice";

  useEffect(() => {
    if (!callActive) {
      setActiveStartedAt(null);
      setElapsedSeconds(0);
      return;
    }

    if (phase === "active" && !activeStartedAt) {
      setActiveStartedAt(Date.now());
    }
  }, [activeStartedAt, callActive, phase]);

  useEffect(() => {
    if (!activeStartedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - activeStartedAt) / 1000)),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeStartedAt]);

  return (
    <>
      <CallErrorModal />

      <AnimatePresence>
        {callActive && phase === "incoming" ? (
          <IncomingCallOverlay
            key={`incoming-${currentCall.id}`}
            name={remoteName}
            avatar={remoteUser?.avatar}
            isVideoCall={currentCall.kind === "video"}
            onDecline={rejectIncomingCall}
            onAccept={() => {
              void acceptIncomingCall(currentCall.kind);
            }}
            onAcceptAudioOnly={() => {
              void acceptIncomingCall("voice");
            }}
          />
        ) : null}

        {callActive && phase !== "incoming" ? (
          <CallScreen
            key={currentCall.id}
            name={remoteName}
            avatar={remoteUser?.avatar}
            elapsedSeconds={elapsedSeconds}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
