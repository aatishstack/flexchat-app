import { api } from "@/services/api";

type Listener = () => void;

declare global {
  interface Window {
    __serverTimeOffset?: number;
  }
}

let serverOffsetMs = 0;
let synced = false;
let syncInFlight: Promise<void> | null = null;

const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function getServerNow() {
  return Date.now() + (globalThis.window?.__serverTimeOffset ?? serverOffsetMs);
}

export function getServerDate() {
  return new Date(getServerNow());
}

export function isServerTimeSynced() {
  return synced;
}

export function subscribeServerTime(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function syncServerTime() {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const requestStartedAt = Date.now();
    const responseData = await fetch("/api/time", {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Time sync failed");
        }

        return response.json() as Promise<{
          serverTime?: number;
          utc?: string;
          epochMs?: number;
        }>;
      })
      .catch(async () => {
        const response = await api.get<{
          utc: string;
          epochMs: number;
          serverTime?: number;
        }>("/time", {
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        return response.data;
      });
    const requestEndedAt = Date.now();
    const measuredClientNow =
      requestStartedAt + (requestEndedAt - requestStartedAt) / 2;
    const serverEpochMs =
      typeof responseData.serverTime === "number" &&
      Number.isFinite(responseData.serverTime)
        ? responseData.serverTime
        : typeof responseData.epochMs === "number" &&
            Number.isFinite(responseData.epochMs)
          ? responseData.epochMs
          : Date.parse(responseData.utc ?? "");

    if (!Number.isFinite(serverEpochMs)) {
      return;
    }

    serverOffsetMs = serverEpochMs - measuredClientNow;
    window.__serverTimeOffset = serverOffsetMs;
    synced = true;
    notifyListeners();
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}
