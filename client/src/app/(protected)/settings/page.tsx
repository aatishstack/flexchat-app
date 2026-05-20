"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Database,
  Headphones,
  LockKeyhole,
  LogOut,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Video,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/query-client";
import { tokenStorage } from "@/lib/token";
import { useCallStore } from "@/store/call-store";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";
import { useConversationStore } from "@/stores/conversation.store";

type SettingKey =
  | "readReceipts"
  | "typingIndicators"
  | "onlinePresence"
  | "messagePreviews"
  | "soundAlerts"
  | "hdCalls"
  | "cameraPreview"
  | "mediaAutoDownload"
  | "storageSaver";

type SettingsState = Record<SettingKey, boolean>;

const SETTINGS_STORAGE_KEY =
  "flexchat-premium-settings";

const defaultSettings: SettingsState = {
  readReceipts: true,
  typingIndicators: true,
  onlinePresence: true,
  messagePreviews: true,
  soundAlerts: true,
  hdCalls: true,
  cameraPreview: true,
  mediaAutoDownload: false,
  storageSaver: true,
};

function readStoredSettings() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const stored =
      window.localStorage.getItem(
        SETTINGS_STORAGE_KEY
      );

    return stored
      ? {
          ...defaultSettings,
          ...JSON.parse(stored),
        }
      : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-8 w-14 shrink-0 rounded-full border p-1 transition-all duration-300 ${
        checked
          ? "border-purple-300/30 bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-600/25"
          : "border-white/10 bg-white/[0.06]"
      }`}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 30,
        }}
        className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#121624] shadow-lg ${
          checked
            ? "left-7"
            : "left-1"
        }`}
      >
        {checked ? (
          <Check size={13} strokeWidth={3} />
        ) : null}
      </motion.span>
    </button>
  );
}

function SettingRow({
  icon: Icon,
  title,
  detail,
  checked,
  onToggle,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_14px_45px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition hover:border-purple-300/20 hover:bg-white/[0.06]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-purple-300/[0.15] bg-purple-500/[0.12] text-purple-100">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          {detail}
        </p>
      </div>

      <ToggleSwitch
        checked={checked}
        onChange={onToggle}
        label={title}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.22em] text-purple-200/70">
        {title}
      </h2>
      <div className="grid gap-3">
        {children}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [
    settings,
    setSettings,
  ] = useState<SettingsState>(
    readStoredSettings
  );
  const [
    logoutConfirmOpen,
    setLogoutConfirmOpen,
  ] = useState(false);

  const isConnected =
    useSocketStore(
      (state) => state.isConnected
    );
  const disconnectSocket =
    useSocketStore(
      (state) =>
        state.disconnectSocket
    );
  const logout =
    useAuthStore(
      (state) => state.logout
    );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  }, [
    settings,
  ]);

  const sections = useMemo(
    () => [
      {
        title: "Privacy",
        rows: [
          {
            key: "readReceipts" as const,
            icon: ShieldCheck,
            title: "Read receipts",
            detail:
              "Let conversations know when messages are seen.",
          },
          {
            key: "typingIndicators" as const,
            icon: MessageCircle,
            title: "Typing indicators",
            detail:
              "Show subtle live typing feedback in active chats.",
          },
          {
            key: "onlinePresence" as const,
            icon: Wifi,
            title: "Online presence",
            detail:
              "Share your active status with trusted conversations.",
          },
        ],
      },
      {
        title: "Notifications",
        rows: [
          {
            key: "messagePreviews" as const,
            icon: Bell,
            title: "Message previews",
            detail:
              "Show clean previews in notification cards.",
          },
          {
            key: "soundAlerts" as const,
            icon: Headphones,
            title: "Sound alerts",
            detail:
              "Play a soft alert for new realtime messages.",
          },
        ],
      },
      {
        title: "Calls",
        rows: [
          {
            key: "hdCalls" as const,
            icon: Video,
            title: "HD calls",
            detail:
              "Prefer higher quality camera streams when available.",
          },
          {
            key: "cameraPreview" as const,
            icon: LockKeyhole,
            title: "Camera preview",
            detail:
              "Show your local preview during video calls.",
          },
        ],
      },
      {
        title: "Data",
        rows: [
          {
            key: "mediaAutoDownload" as const,
            icon: Database,
            title: "Auto-download media",
            detail:
              "Download shared media automatically on trusted networks.",
          },
          {
            key: "storageSaver" as const,
            icon: Database,
            title: "Storage saver",
            detail:
              "Prefer lighter cached media during long sessions.",
          },
        ],
      },
    ],
    []
  );

  const toggleSetting =
    useCallback((key: SettingKey) => {
      setSettings((current) => ({
        ...current,
        [key]: !current[key],
      }));
    }, []);

  const confirmLogout =
    useCallback(() => {
      tokenStorage.remove();
      queryClient.clear();
      useCallStore.getState().resetCall();
      useConversationStore
        .getState()
        .resetConversationState();
      disconnectSocket();
      logout();
      router.replace("/auth");
    }, [
      disconnectSocket,
      logout,
      router,
    ]);

  if (!user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#070B14] px-6 text-white">
        <div className="h-12 w-12 animate-spin rounded-2xl border border-purple-400/25 border-t-purple-300" />
      </main>
    );
  }

  return (
    <main className="modal-safe-scroll min-h-dvh bg-[linear-gradient(135deg,rgba(168,85,247,0.20)_0%,transparent_34%),linear-gradient(225deg,rgba(6,182,212,0.10)_0%,transparent_28%),linear-gradient(135deg,#050816_0%,#080d19_48%,#0b1020_100%)] px-4 py-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-4xl flex-col">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200 shadow-lg shadow-black/20 backdrop-blur-xl transition hover:bg-white/[0.09]"
            aria-label="Back to chat"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-xl">
            FlexChat 1.0.0
          </div>
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 28,
          }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0B111C]/[0.88] shadow-[0_30px_100px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-200/50 to-transparent" />

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="flex flex-col gap-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-purple-500 via-fuchsia-600 to-violet-700 text-2xl font-bold shadow-[0_20px_60px_rgba(147,51,234,0.34)]">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.username
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold">
                      Settings
                    </h1>
                    <p className="mt-1 truncate text-sm text-zinc-400">
                      @{user.username}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <Link
                    href="/profile"
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/[0.15] px-4 py-3 transition hover:border-purple-300/25 hover:bg-purple-500/[0.12]"
                  >
                    <UserRound
                      size={18}
                      className="text-purple-200"
                    />
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      View profile
                    </span>
                    <ChevronRight
                      size={17}
                      className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white"
                    />
                  </Link>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/[0.15] px-4 py-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isConnected
                          ? "bg-green-400 shadow-lg shadow-green-500/40"
                          : "bg-amber-300 shadow-lg shadow-amber-500/30"
                      }`}
                    />
                    <span className="text-sm text-zinc-300">
                      {isConnected
                        ? "Realtime connected"
                        : "Reconnecting"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLogoutConfirmOpen(true)
                }
                className="flex h-14 items-center justify-center gap-2 rounded-[24px] border border-red-300/20 bg-red-500/[0.12] px-5 py-4 text-sm font-semibold text-red-100 shadow-[0_18px_55px_rgba(239,68,68,0.14)] transition hover:bg-red-500/20"
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>

            <div className="grid gap-6">
              {sections.map((section) => (
                <Section
                  key={section.title}
                  title={section.title}
                >
                  {section.rows.map((row) => (
                    <SettingRow
                      key={row.key}
                      icon={row.icon}
                      title={row.title}
                      detail={row.detail}
                      checked={settings[row.key]}
                      onToggle={() =>
                        toggleSetting(row.key)
                      }
                    />
                  ))}
                </Section>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {logoutConfirmOpen ? (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[280] flex items-center justify-center bg-black/[0.72] p-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 18,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 18,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 28,
              }}
              className="w-full max-w-sm rounded-[30px] border border-white/10 bg-[#0B111C]/[0.96] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/[0.15] text-red-100">
                  <AlertTriangle size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    Log out?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    Your session will end on this device. Realtime sync resumes after you sign in again.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setLogoutConfirmOpen(false)
                  }
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogout}
                  className="h-12 rounded-2xl bg-red-500 text-sm font-semibold text-white shadow-xl shadow-red-500/25 transition hover:bg-red-400"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
