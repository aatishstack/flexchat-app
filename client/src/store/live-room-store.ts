import { create } from "zustand";

type LiveRoomStore = {
  active: boolean;

  expanded: boolean;

  roomName: string;

  listeners: number;

  joinRoom: (
    roomName: string
  ) => void;

  leaveRoom: () => void;

  toggleExpanded: () => void;
};

export const useLiveRoomStore =
  create<LiveRoomStore>(
    (
      set
    ) => ({
      active: false,

      expanded: false,

      roomName:
        "Flex Chill Room",

      listeners: 12,

      joinRoom: (
        roomName
      ) =>
        set({
          active: true,
          expanded: true,
          roomName,
        }),

      leaveRoom: () =>
        set({
          active: false,
          expanded: false,
        }),

      toggleExpanded:
        () =>
          set(
            (
              state
            ) => ({
              expanded:
                !state.expanded,
            })
          ),
    })
  );