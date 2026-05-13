"use client";

import { create } from "zustand";

interface Toast {
  id: string;

  title: string;

  message: string;
}

interface ToastState {
  toasts: Toast[];

  pushToast: (
    toast: Toast
  ) => void;

  removeToast: (
    id: string
  ) => void;
}

export const useToastStore =
  create<ToastState>(
    (
      set
    ) => ({
      toasts: [],

      pushToast: (
        toast
      ) =>
        set(
          (
            state
          ) => ({
            toasts: [
              ...state.toasts,
              toast,
            ],
          })
        ),

      removeToast: (
        id
      ) =>
        set(
          (
            state
          ) => ({
            toasts:
              state.toasts.filter(
                (
                  toast
                ) =>
                  toast.id !==
                  id
              ),
          })
        ),
    })
  );