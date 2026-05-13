"use client";

import { create } from "zustand";

interface PinState {
  pinned:
    any[];

  pin: (
    message: any
  ) => void;

  unpin: (
    id: string
  ) => void;
}

export const usePinStore =
  create<PinState>(
    (set) => ({
      pinned: [],

      pin: (
        message
      ) =>
        set(
          (
            state
          ) => ({
            pinned:
              state.pinned.some(
                (
                  item
                ) =>
                  item.id ===
                  message.id
              )
                ? state.pinned
                : [
                    message,
                    ...state.pinned,
                  ],
          })
        ),

      unpin: (
        id
      ) =>
        set(
          (
            state
          ) => ({
            pinned:
              state.pinned.filter(
                (
                  item
                ) =>
                  item.id !==
                  id
              ),
          })
        ),
    })
  );