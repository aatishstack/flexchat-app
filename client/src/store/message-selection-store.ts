"use client";

import { create } from "zustand";

interface SelectionState {
  selected:
    string[];

  toggle: (
    id: string
  ) => void;

  clear: () => void;
}

export const useMessageSelectionStore =
  create<SelectionState>(
    (set) => ({
      selected: [],

      toggle: (
        id
      ) =>
        set(
          (
            state
          ) => ({
            selected:
              state.selected.includes(
                id
              )
                ? state.selected.filter(
                    (
                      item
                    ) =>
                      item !==
                      id
                  )
                : [
                    ...state.selected,
                    id,
                  ],
          })
        ),

      clear: () =>
        set({
          selected: [],
        }),
    })
  );