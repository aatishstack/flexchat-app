"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import { useUsersByIdsQuery } from "@/hooks/queries/use-users-query";
import {
  useCallStore,
  type CallNetworkState,
} from "@/store/call-store";
import { useAuthStore } from "@/stores/auth.store";

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds =
    seconds % 60;

  return `${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function networkLabel(
  networkState: CallNetworkState
) {
  if (networkState === "reconnecting") {
    return "Reconnecting";
  }

  if (networkState === "connecting") {
    return "Connecting";
  }

  return "HD stable";
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
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

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

function VoiceSurface({
  name,
  avatar,
}: {
  name: string;
  avatar?: string | null;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_52%)] px-8 text-center">
      <div className="relative">
        <motion.div
          animate={{
            scale: [1, 1.18, 1],
            opacity: [0.25, 0.06, 0.25],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
          }}
          className="absolute inset-[-34px] rounded-full border border-purple-300/50"
        />
        <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[36px] bg-gradient-to-br from-purple-500 to-fuchsia-500 text-4xl font-bold shadow-[0_24px_70px_rgba(147,51,234,0.35)]">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </div>
      </div>

      <h2 className="mt-8 text-2xl font-semibold">
        {name}
      </h2>
    </div>
  );
}

export default function CallLayer() {
  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);
  const reducedMotion =
    useReducedMotion();
  const currentUserId =
    useAuthStore(
      (state) => state.user?.id
    );
  const {
    currentCall,
    phase,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    isMinimized,
    networkState,
    error,
    acceptIncomingCall,
    rejectIncomingCall,
    cancelOutgoingCall,
    endCall,
    toggleMute,
    toggleVideo,
    minimizeCall,
    restoreCall,
  } = useCallStore();

  const remoteUserId = useMemo(() => {
    if (!currentCall || !currentUserId) {
      return "";
    }

    return currentCall.callerId === currentUserId
      ? currentCall.calleeId
      : currentCall.callerId;
  }, [
    currentCall,
    currentUserId,
  ]);

  const usersQuery =
    useUsersByIdsQuery(
      remoteUserId ? [remoteUserId] : []
    );
  const remoteUser =
    usersQuery.data?.[0];
  const remoteName =
    remoteUser?.username ??
    (phase === "incoming"
      ? "Incoming call"
      : "FlexChat call");
  const callActive =
    phase !== "idle" &&
    currentCall;
  const isVideoCall =
    currentCall?.kind === "video";

  useEffect(() => {
    if (!callActive) {
      return;
    }

    const startedAt =
      currentCall.startedAt;
    const timer = setInterval(() => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor(
            (Date.now() -
              new Date(startedAt).getTime()) /
              1000
          )
        )
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    callActive,
    currentCall?.startedAt,
  ]);

  if (!callActive) {
    return null;
  }

  if (isMinimized) {
    return (
      <motion.button
        type="button"
        onClick={restoreCall}
        initial={{
          opacity: 0,
          y: 20,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-4 z-[220] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-[24px] border border-purple-400/30 bg-[#0B111C]/95 p-3 pr-4 text-left shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-3xl sm:left-auto sm:right-5 lg:bottom-6 xl:right-[calc(var(--chat-right-rail-width,20rem)+1.5rem)]"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white">
          {isVideoCall ? (
            <Video size={18} />
          ) : (
            <Phone size={18} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            {remoteName}
          </p>
          <p className="text-xs text-purple-200">
            {formatElapsed(elapsedSeconds)}
          </p>
        </div>
        <Maximize2
          size={16}
          className="text-zinc-400"
        />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key={currentCall.id}
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/[0.84] p-3 text-white backdrop-blur-xl sm:p-6"
      >
        <motion.div
          initial={
            reducedMotion
              ? false
              : {
                  scale: 0.96,
                  y: 18,
                }
          }
          animate={{
            scale: 1,
            y: 0,
          }}
          exit={
            reducedMotion
              ? undefined
              : {
                  scale: 0.96,
                  y: 18,
                }
          }
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 28,
          }}
          className="relative h-[min(760px,94dvh)] w-full max-w-[440px] overflow-hidden rounded-[34px] border border-white/10 bg-[#080B14] shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
        >
          <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-5 pb-14 pt-[calc(1.1rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase text-purple-200/80">
                  {phase === "incoming"
                    ? "Incoming"
                    : phase === "outgoing"
                      ? "Calling"
                      : "FlexChat Call"}
                </p>
                <h2 className="truncate text-lg font-semibold">
                  {remoteName}
                </h2>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/80 backdrop-blur-xl">
                <span
                  className={`h-2 w-2 rounded-full ${
                    networkState ===
                    "reconnecting"
                      ? "bg-amber-300"
                      : networkState ===
                          "connecting"
                        ? "bg-purple-300"
                        : "bg-green-400"
                  }`}
                />
                {networkLabel(networkState)}
              </div>
            </div>
          </div>

          {isVideoCall &&
          (remoteStream || localStream) ? (
            <div className="h-full bg-black">
              {remoteStream ? (
                <StreamVideo
                  stream={remoteStream}
                  className="h-full w-full object-cover"
                />
              ) : (
                <StreamVideo
                  stream={localStream}
                  muted
                  className="h-full w-full object-cover opacity-70"
                />
              )}

              {localStream ? (
                <div className="absolute bottom-28 right-4 z-20 h-36 w-24 overflow-hidden rounded-3xl border border-white/[0.15] bg-black shadow-2xl">
                  <StreamVideo
                    stream={localStream}
                    muted
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <VoiceSurface
              name={remoteName}
              avatar={remoteUser?.avatar}
            />
          )}

          <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/[0.82] via-black/[0.44] to-transparent px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-16">
            <div className="mb-5 text-center">
              <p className="text-sm text-white/70">
                {phase === "active"
                  ? formatElapsed(elapsedSeconds)
                  : phase === "incoming"
                    ? "Ringing"
                    : phase === "outgoing"
                      ? "Waiting for answer"
                      : "Connecting media"}
              </p>
              {error ? (
                <p className="mt-2 text-xs text-red-200">
                  {error}
                </p>
              ) : null}
            </div>

            {phase === "incoming" ? (
              <div className="flex items-center justify-center gap-5">
                <button
                  type="button"
                  onClick={rejectIncomingCall}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl shadow-red-500/30 transition hover:scale-105"
                  aria-label="Decline call"
                >
                  <PhoneOff size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void acceptIncomingCall();
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl shadow-green-500/30 transition hover:scale-105"
                  aria-label="Accept call"
                >
                  <Phone size={24} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-white shadow-xl transition hover:scale-105 ${
                    isMuted
                      ? "bg-red-500"
                      : "bg-white/[0.12]"
                  }`}
                  aria-label={
                    isMuted
                      ? "Unmute"
                      : "Mute"
                  }
                >
                  {isMuted ? (
                    <MicOff size={21} />
                  ) : (
                    <Mic size={21} />
                  )}
                </button>

                {isVideoCall ? (
                  <button
                    type="button"
                    onClick={toggleVideo}
                    className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-white shadow-xl transition hover:scale-105 ${
                      isVideoEnabled
                        ? "bg-white/[0.12]"
                        : "bg-red-500"
                    }`}
                    aria-label={
                      isVideoEnabled
                        ? "Turn video off"
                        : "Turn video on"
                    }
                  >
                    {isVideoEnabled ? (
                      <Video size={21} />
                    ) : (
                      <VideoOff size={21} />
                    )}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={
                    phase === "outgoing"
                      ? cancelOutgoingCall
                      : endCall
                  }
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl shadow-red-500/30 transition hover:scale-105"
                  aria-label="End call"
                >
                  <PhoneOff size={24} />
                </button>

                <button
                  type="button"
                  onClick={minimizeCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.12] text-white shadow-xl transition hover:scale-105"
                  aria-label="Minimize call"
                >
                  <Minimize2 size={20} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
