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
  Bell,
  MessageCircle,
  Volume2,
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
            className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#16161D] p-8 shadow-[0_64px_160px_rgba(0,0,0,1)]"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-red-500/20 bg-red-500/10 text-red-400">
                <PhoneOff size={28} />
              </div>

              <div className="mt-6">
                <h2 className="text-2xl font-bold tracking-tight">Call Error</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-white/50">
                  {modalError}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissCallModal}
              className="mt-10 h-14 w-full rounded-[18px] bg-[#7C4FF0] text-[15px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#7C4FF0]/30 transition hover:bg-[#8B5CF6] active:scale-95"
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
      className="fixed inset-0 z-[9999] flex flex-col h-full"
      style={{ background: "#08060F" }}
    >
      <div className="flex flex-col items-center flex-1 pt-14 px-6">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/35 mb-10">
          Incoming call
        </p>
        
        <div className="relative flex items-center justify-center mb-7">
          <motion.div 
            animate={{ scale: [1, 1.4], opacity: [0.1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute rounded-full" 
            style={{ width: 148, height: 148, background: "rgba(124,79,240,0.4)" }} 
          />
          <div className="absolute rounded-full" style={{ width: 126, height: 126, background: "rgba(124,79,240,0.12)" }} />
          <div className="absolute rounded-full" style={{ width: 108, height: 108, background: "rgba(124,79,240,0.18)" }} />
          
          <div className="relative z-10 w-24 h-24 rounded-full overflow-hidden border-2 border-[#7C4FF0]/50 shadow-2xl">
            <FlexAvatar
              src={avatar}
              name={name}
              className="h-full w-full text-[30px] font-black"
            />
          </div>
        </div>

        <h2 className="text-[28px] font-extrabold text-white mb-1.5">{name}</h2>
        <p className="text-[13.5px] text-white/38 font-medium">FlexChat {isVideoCall ? "Video" : "Audio"} Call</p>

        <div className="flex flex-col items-center gap-2.5 mt-9">
          <button className="flex items-center gap-2 rounded-full px-5 py-2.5 bg-white/[0.07] active:scale-95 transition-transform">
            <Bell size={14} className="text-white/45" />
            <span className="text-[12.5px] font-semibold text-white/45">Remind me</span>
          </button>
          <button className="flex items-center gap-2 rounded-full px-5 py-2.5 bg-white/[0.07] active:scale-95 transition-transform">
            <MessageCircle size={14} className="text-white/45" />
            <span className="text-[12.5px] font-semibold text-white/45">Send message</span>
          </button>
        </div>
      </div>

      <div className="flex items-end justify-center gap-16 pb-14">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onDecline}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-90 transition-transform"
          >
            <PhoneOff size={26} className="text-white" />
          </button>
          <span className="text-[11.5px] font-semibold text-white/35">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-[#22C55E] shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-90 transition-transform"
          >
            {isVideoCall ? <Video size={26} className="text-white" /> : <Phone size={26} className="text-white" />}
          </button>
          <span className="text-[11.5px] font-semibold text-white/35">Accept</span>
        </div>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-black text-white"
    >
      {/* Top Header Overlay */}
      {isVideoCall && (
        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="w-10" />
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-bold text-white shadow-black drop-shadow-md">{name}</span>
            <span className="text-[11px] text-white/55 font-medium mt-0.5 shadow-black drop-shadow-md">
              {phase === "outgoing" ? "Calling..." : formatElapsed(elapsedSeconds)}
            </span>
          </div>
          <button className="w-10 h-10 flex items-center justify-end pointer-events-auto">
            <Volume2 size={20} className="text-white drop-shadow-md" />
          </button>
        </div>
      )}

      {hasRemoteVideo ? (
        <StreamVideo
          stream={remoteStream}
          className="fixed inset-0 h-full w-full bg-black object-cover"
        />
      ) : (
        <div 
          className="fixed inset-0 flex flex-col items-center justify-center bg-[#0A0614]"
          style={{
            background: isVideoCall 
              ? "radial-gradient(ellipse 70% 60% at 30% 40%, #1B0B38 0%, #0A0614 65%)"
              : "#08060F"
          }}
        >
          <div className="relative mb-10">
             <motion.div
               animate={{ scale: [1, 1.3], opacity: [0.15, 0] }}
               transition={{ duration: 3, repeat: Infinity }}
               className="absolute inset-0 rounded-full bg-[#7C4FF0]/20 scale-150"
             />
             <div className="relative z-10 w-32 h-32 rounded-full overflow-hidden border-2 border-[#7C4FF0]/30 shadow-2xl">
              <FlexAvatar
                src={avatar}
                name={name}
                className="h-full w-full text-5xl font-black"
              />
             </div>
          </div>
          {!isVideoCall && (
            <>
              <h2 className="text-[32px] font-extrabold text-white mb-2">{name}</h2>
              <p className="text-[14px] text-[#7C4FF0] font-bold tracking-widest uppercase">
                {phase === "outgoing" ? "Calling..." : formatElapsed(elapsedSeconds)}
              </p>
            </>
          )}
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
          className="fixed z-20 overflow-hidden border border-white/10 bg-[#1E1E27] shadow-2xl touch-none animate-fade-in"
          style={{
            left: selfPosition.x,
            top: selfPosition.y,
            width: 100,
            height: 150,
            borderRadius: 16,
          }}
        >
          <StreamVideo
            stream={localStream}
            muted
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {/* Dynamic Call Controls */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/40 to-transparent px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-20">
        <div className="mx-auto flex items-center justify-center gap-5 max-w-[280px]">
          <button
            type="button"
            onClick={toggleMute}
            className={`w-13 h-13 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
              isMuted ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/20"
            }`}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {isVideoCall ? (
            <>
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-13 h-13 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
                  !isVideoEnabled ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/20"
                }`}
              >
                {!isVideoEnabled ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
              <button
                type="button"
                onClick={() => { void switchCamera(); }}
                className="w-13 h-13 rounded-full flex items-center justify-center bg-white/15 text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-90"
              >
                <SwitchCamera size={22} />
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={phase === "outgoing" ? cancelOutgoingCall : endCall}
            className="w-13 h-13 rounded-full flex items-center justify-center bg-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-[#F87171] transition-all active:scale-90"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>

      {/* Connection Quality Indicator */}
      {networkState === "reconnecting" && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-[#EF4444] px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[12px] font-bold text-white uppercase tracking-wider">Reconnecting...</span>
        </div>
      )}
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
