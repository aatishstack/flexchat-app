"use client";

import { create } from "zustand";

interface MusicState {
  playing: boolean;

  song: string;

  artist: string;

  toggle: () => void;
}

export const useMusicStore =
  create<MusicState>(
    (
      set
    ) => ({
      playing: true,

      song:
        "After Dark",

      artist:
        "Mr.Kitty",

      toggle: () =>
        set(
          (
            state
          ) => ({
            playing:
              !state.playing,
          })
        ),
    })
  );