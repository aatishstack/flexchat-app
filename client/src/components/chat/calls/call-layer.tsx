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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";

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

function playElementMedia(
  element: HTMLMediaElement | null,
) {
  if (!element) {
    return;
  }

  void element.play().catch(() => undefined);
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
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.srcObject = stream;
    playElementMedia(video);

    const retryPlayback = () => playElementMedia(video);

    stream?.getTracks().forEach((track) => {
      track.addEventListener("unmute", retryPlayback);
      track.addEventListener("ended", retryPlayback);
    });

    return () => {
      stream?.getTracks().forEach((track) => {
        track.removeEventListener("unmute", retryPlayback);
        track.removeEventListener("ended", retryPlayback);
      });
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      onLoadedMetadata={(event) => {
        playElementMedia(event.currentTarget);
      }}
    />
  );
}

function StreamAudio({
  stream,
}: {
  stream: MediaStream | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.srcObject = stream;
    playElementMedia(audio);

    const retryPlayback = () => playElementMedia(audio);

    stream?.getAudioTracks().forEach((track) => {
      track.addEventListener("unmute", retryPlayback);
      track.addEventListener("ended", retryPlayback);
    });

    return () => {
      stream?.getAudioTracks().forEach((track) => {
        track.removeEventListener("unmute", retryPlayback);
        track.removeEventListener("ended", retryPlayback);
      });
    };
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      className="hidden"
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
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/90 p-6 text-white backdrop-blur-3xl"
        >
          <motion.div
            initial={{ y: 32, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 32, scale: 0.95 }}
            className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[var(--fc-modal)] p-8 shadow-[0_64px_160px_rgba(0,0,0,1)]"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-red-500/20 bg-red-500/10 text-red-400">
                <PhoneOff size={28} />
              </div>

              <div className="mt-6">
                <h2 className="text-2xl font-bold tracking-tight">Call Error</h2>
                <p className="fc-muted mt-2 text-[15px] leading-relaxed">
                  {modalError}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissCallModal}
              className="mt-10 h-14 w-full rounded-[18px] bg-[var(--fc-primary)] text-[15px] font-black uppercase tracking-widest text-white shadow-xl shadow-[rgba(var(--fc-primary-rgb),0.3)] transition hover:bg-[var(--fc-primary-hover)] active:scale-95"
            >
              Close
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
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      activeOscillator = osc;
      activeGain = gain;

      window.setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, 600);
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/98 px-6 text-white backdrop-blur-3xl"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative">
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-[var(--fc-primary)]/50"
          />
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.4], opacity: [0.2, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
            className="absolute inset-0 rounded-full border-2 border-[var(--fc-primary)]/30"
          />
          <FlexAvatar
            src={avatar}
            name={name}
            className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] bg-[var(--fc-primary)] text-4xl font-black shadow-[0_48px_100px_rgba(var(--fc-primary-rgb),0.5)]"
          />
        </div>

        <h2 className="mt-12 text-4xl font-bold tracking-tight">{name}</h2>
        <p className="mt-4 text-[13px] font-black uppercase tracking-[0.2em] text-[var(--fc-accent-text)] opacity-90">
          Incoming {isVideoCall ? "Video" : "Audio"} Call
        </p>

        <div className="mt-20 flex w-full items-center justify-center gap-12">
          <div className="flex flex-col items-center gap-4">
             <button
               type="button"
               onClick={onDecline}
               className="flex h-18 w-18 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_16px_48px_rgba(239,68,68,0.4)] transition hover:scale-110 active:scale-90"
               aria-label="Decline call"
             >
               <PhoneOff size={32} />
             </button>
             <span className="text-[11px] font-black uppercase tracking-[0.15em] text-red-400">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-4">
             <button
               type="button"
               onClick={onAccept}
               className="flex h-18 w-18 items-center justify-center rounded-full bg-[var(--fc-primary)] text-white shadow-[0_16px_48px_rgba(var(--fc-primary-rgb),0.4)] transition hover:scale-110 active:scale-90"
               aria-label="Accept call"
             >
               {isVideoCall ? <Video size={32} /> : <Phone size={32} />}
             </button>
             <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-accent-text)]">Accept</span>
          </div>
        </div>

        {isVideoCall ? (
          <button
            type="button"
            onClick={onAcceptAudioOnly}
            className="mt-14 rounded-[18px] bg-white/[0.08] px-8 py-4 text-[13px] font-black uppercase tracking-widest text-white transition hover:bg-white/[0.12] active:scale-95"
          >
            Voice Only
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
  } = useCallStore(
    useShallow((state) => ({
      currentCall: state.currentCall,
      phase: state.phase,
      localStream: state.localStream,
      remoteStream: state.remoteStream,
      answerKind: state.answerKind,
      isMuted: state.isMuted,
      isVideoEnabled: state.isVideoEnabled,
      networkState: state.networkState,
      toggleMute: state.toggleMute,
      toggleVideo: state.toggleVideo,
      switchCamera: state.switchCamera,
      endCall: state.endCall,
      cancelOutgoingCall: state.cancelOutgoingCall,
    })),
  );
  const [selfPosition, setSelfPosition] = useState<{
    x: number;
    y: number;
  } | null>(() =>
    typeof window === "undefined"
      ? null
      : {
          x: Math.max(16, window.innerWidth - 136),
          y: Math.max(16, window.innerHeight - 206),
        },
  );
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [, forceTrackUpdate] = useState(0);
  const isVideoCall = currentCall?.kind === "video" && answerKind !== "voice";
  const remoteVideoTrack = remoteStream?.getVideoTracks()[0] ?? null;
  const localVideoTrack = localStream?.getVideoTracks()[0] ?? null;
  const hasRemoteVideo =
    isVideoCall &&
    !!remoteVideoTrack &&
    remoteVideoTrack.enabled &&
    remoteVideoTrack.readyState === "live";
  const hasSelfVideo =
    isVideoCall &&
    !!localVideoTrack &&
    localVideoTrack.readyState === "live";
  const shouldPlayRemoteAudio =
    !!remoteStream?.getAudioTracks().length && !hasRemoteVideo;

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

  useEffect(() => {
    function clampSelfPreview() {
      setSelfPosition((position) => {
        if (!position) {
          return position;
        }

        return {
          x: Math.min(
            window.innerWidth - 136,
            Math.max(16, position.x),
          ),
          y: Math.min(
            window.innerHeight - 206,
            Math.max(16, position.y),
          ),
        };
      });
    }

    window.addEventListener("resize", clampSelfPreview);
    window.addEventListener("orientationchange", clampSelfPreview);

    return () => {
      window.removeEventListener("resize", clampSelfPreview);
      window.removeEventListener("orientationchange", clampSelfPreview);
    };
  }, []);

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
        window.innerHeight - 206,
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
    "flex h-15 w-15 items-center justify-center rounded-full text-white shadow-2xl transition hover:scale-110 active:scale-90 backdrop-blur-3xl";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-black text-white"
    >
      {hasRemoteVideo ? (
        <StreamVideo
          stream={remoteStream}
          className="fixed inset-0 h-full w-full bg-black object-cover"
        />
      ) : (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black">
          <div className="relative">
             <motion.div
               animate={{ scale: [1, 1.3], opacity: [0.2, 0] }}
               transition={{ duration: 3, repeat: Infinity }}
               className="absolute inset-0 rounded-[36px] bg-[var(--fc-primary)]/20"
             />
             <FlexAvatar
               src={avatar}
               name={name}
               className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-[36px] bg-[var(--fc-primary)] text-6xl font-black shadow-[0_64px_160px_rgba(0,0,0,1)]"
             />
          </div>
          <h2 className="mt-12 text-4xl font-bold tracking-tight">{name}</h2>
          <p className="mt-4 text-[13px] font-black uppercase tracking-[0.2em] text-[var(--fc-accent-text)] opacity-90">
            {phase === "outgoing" ? "Ringing..." : "Audio Call"}
          </p>
        </div>
      )}

      {shouldPlayRemoteAudio ? (
        <StreamAudio stream={remoteStream} />
      ) : null}

      {hasSelfVideo && selfPosition ? (
        <div
          role="presentation"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="fixed z-20 overflow-hidden border border-white/10 bg-black shadow-2xl touch-none"
          style={{
            left: selfPosition.x,
            top: selfPosition.y,
            width: 120,
            height: 190,
            borderRadius: 24,
          }}
        >
          <StreamVideo
            stream={localStream}
            muted
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-6 pb-20 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-tight">{name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[14px] font-bold text-white/70">
                {phase === "active"
                  ? formatElapsed(elapsedSeconds)
                  : phase === "outgoing"
                    ? "Ringing"
                    : networkState === "reconnecting"
                      ? "Reconnecting"
                      : "Connecting"}
              </p>
              {phase === "active" && (
                <div className="h-1 w-1 rounded-full bg-white/30" />
              )}
              {phase === "active" && (
                <p className="text-[14px] font-bold text-[var(--fc-accent-text)]">
                  Active
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white/90 backdrop-blur-3xl border border-white/5">
            <div className={`h-1.5 w-1.5 rounded-full ${networkState === "reconnecting" ? "bg-red-500 animate-pulse" : "bg-[var(--fc-success)]"}`} />
            {networkState === "reconnecting" ? "Network Issue" : "Secure Line"}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/40 to-transparent px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-28">
        <div className="mx-auto flex max-w-md items-center justify-center gap-6">
          <button
            type="button"
            onClick={toggleMute}
            className={`${controlClass} h-16 w-16 ${isMuted ? "bg-red-500" : "bg-white/[0.08] hover:bg-white/[0.12] border border-white/5"}`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={26} /> : <Mic size={26} />}
          </button>

          {isVideoCall ? (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`${controlClass} h-16 w-16 ${
                  isVideoEnabled ? "bg-white/[0.08] hover:bg-white/[0.12] border border-white/5" : "bg-red-500"
                }`}
                aria-label={isVideoEnabled ? "Turn camera off" : "Turn camera on"}
              >
                {isVideoEnabled ? <Video size={26} /> : <VideoOff size={26} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  void switchCamera();
                }}
                className={`${controlClass} h-16 w-16 bg-white/[0.08] hover:bg-white/[0.12] border border-white/5`}
                aria-label="Flip camera"
              >
                <SwitchCamera size={26} />
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={phase === "outgoing" ? cancelOutgoingCall : endCall}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_20px_60px_rgba(239,68,68,0.5)] transition hover:scale-110 active:scale-90"
            aria-label="End call"
          >
            <PhoneOff size={32} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}


export default function CallLayer() {
  const activeStartedAtRef = useRef<{
    callId: string;
    startedAt: number;
  } | null>(null);
  const [elapsed, setElapsed] = useState<{
    callId: string;
    seconds: number;
  } | null>(null);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const {
    currentCall,
    phase,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useCallStore(
    useShallow((state) => ({
      currentCall: state.currentCall,
      phase: state.phase,
      acceptIncomingCall: state.acceptIncomingCall,
      rejectIncomingCall: state.rejectIncomingCall,
    })),
  );
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
  const elapsedSeconds =
    elapsed &&
    elapsed.callId === currentCall?.id
      ? elapsed.seconds
      : 0;

  useEffect(() => {
    if (
      !callActive ||
      phase !== "active" ||
      !currentCall
    ) {
      activeStartedAtRef.current = null;
      return;
    }

    if (
      activeStartedAtRef.current?.callId !==
      currentCall.id
    ) {
      activeStartedAtRef.current = {
        callId: currentCall.id,
        startedAt: Date.now(),
      };
    }

    const callId = currentCall.id;

    const timer = window.setInterval(() => {
      const startedAt =
        activeStartedAtRef.current;

      if (startedAt?.callId === callId) {
        setElapsed({
          callId,
          seconds: Math.max(
            0,
            Math.floor(
              (Date.now() - startedAt.startedAt) /
                1000,
            ),
          ),
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    callActive,
    currentCall,
    phase,
  ]);

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
