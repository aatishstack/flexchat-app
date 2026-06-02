"use client";

export function triggerHaptic(pattern: number | number[] = 10) {
  if (typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }

  navigator.vibrate(pattern);
}
