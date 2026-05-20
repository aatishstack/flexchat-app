"use client";

import { create } from "zustand";

export type ToastVariant =
  | "success"
  | "error"
  | "info"
  | "warning";

export interface Toast {
  id: string;

  title: string;

  message?: string;

  variant: ToastVariant;

  durationMs: number;

  createdAt: number;
}

type ToastInput = {
  id?: string;
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

interface ToastState {
  toasts: Toast[];

  pushToast: (
    toast: ToastInput
  ) => void;

  removeToast: (
    id: string
  ) => void;

  clearToasts: () => void;
}

const DEFAULT_DURATION_MS = 3000;
const MAX_TOASTS = 4;
const DEDUPE_WINDOW_MS = 850;

function createToast(
  toast: ToastInput
): Toast {
  const createdAt = Date.now();

  return {
    id:
      toast.id ??
      `toast-${createdAt}-${Math.random()
        .toString(36)
        .slice(2)}`,
    title: toast.title,
    message: toast.message,
    variant: toast.variant ?? "info",
    durationMs:
      toast.durationMs ?? DEFAULT_DURATION_MS,
    createdAt,
  };
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
          ) => {
            const nextToast =
              createToast(toast);

            const withoutRecentDuplicate =
              state.toasts.filter(
                (
                  item
                ) =>
                  item.id !== nextToast.id &&
                  !(
                    item.variant ===
                      nextToast.variant &&
                    item.title ===
                      nextToast.title &&
                    item.message ===
                      nextToast.message &&
                    nextToast.createdAt -
                      item.createdAt <
                      DEDUPE_WINDOW_MS
                  )
              );

            return {
              toasts: [
                nextToast,
                ...withoutRecentDuplicate,
              ].slice(0, MAX_TOASTS),
            };
          }
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

      clearToasts: () =>
        set({
          toasts: [],
        }),
    })
  );
