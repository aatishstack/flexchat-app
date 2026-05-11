"use client";

import { create } from "zustand";

interface MediaStore {
  previewImage: string | null;

  setPreviewImage: (
    value: string | null
  ) => void;
}

export const useMediaStore =
  create<MediaStore>((set) => ({
    previewImage: null,

    setPreviewImage: (
      value
    ) =>
      set({
        previewImage: value,
      }),
  }));