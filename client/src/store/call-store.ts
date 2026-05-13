import { create } from "zustand";

type CallStatus =
  | "idle"
  | "incoming"
  | "ringing"
  | "active"
  | "minimized";

type CallStore = {
  status: CallStatus;

  caller: string;

  isMuted: boolean;

  isVideoEnabled: boolean;

  incomingCall: (
    caller: string
  ) => void;

  startCall: (
    caller: string
  ) => void;

  acceptCall: () => void;

  rejectCall: () => void;

  minimizeCall: () => void;

  endCall: () => void;

  toggleMute: () => void;

  toggleVideo: () => void;
};

export const useCallStore =
  create<CallStore>(
    (
      set
    ) => ({
      status: "idle",

      caller: "Mayuri",

      isMuted: false,

      isVideoEnabled: true,

      incomingCall: (
        caller
      ) =>
        set({
          status:
            "incoming",
          caller,
        }),

      startCall: (
        caller
      ) =>
        set({
          status:
            "ringing",
          caller,
        }),

      acceptCall: () =>
        set({
          status:
            "active",
        }),

      rejectCall: () =>
        set({
          status:
            "idle",
        }),

      minimizeCall: () =>
        set({
          status:
            "minimized",
        }),

      endCall: () =>
        set({
          status:
            "idle",
        }),

      toggleMute: () =>
        set(
          (
            state
          ) => ({
            isMuted:
              !state.isMuted,
          })
        ),

      toggleVideo:
        () =>
          set(
            (
              state
            ) => ({
              isVideoEnabled:
                !state.isVideoEnabled,
            })
          ),
    })
  );