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
  Loader2,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Palette,
  ShieldCheck,
  Smartphone,
  Trash2,
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
import {
  formatHandle,
  getAvatarInitial,
} from "@/lib/user-display";
import { clearClientSession } from "@/lib/session-cleanup";
import { deleteCurrentUser } from "@/services/user.service";
import { useSocketStore } from "@/store/socket-store";
import { useToastStore } from "@/store/toast-store";

type SettingKey =
  | "readReceipts"
  | "typingIndicators"
  | "onlinePresence"
  | "messagePreviews"
  | "soundAlerts"
  | "hdCalls"
  | "cameraPreview"
  | "mediaAutoDownload"
  | "storageSaver"
  | "loginAlerts"
  | "appLock"
  | "compactLists"
  | "reducedMotion"
  | "deviceSync"
  | "releaseNotes";

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
  loginAlerts: true,
  appLock: false,
  compactLists: false,
  reducedMotion: false,
  deviceSync: true,
  releaseNotes: true,
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
      className={`fc-telegram-touch relative h-7 w-12 shrink-0 rounded-full border p-1 transition-all duration-200 ${
        checked
          ? "border-[#2481CC]/40 bg-[#2481CC]"
          : "border-white/10 bg-[#0F1C29]"
      }`}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 30,
        }}
        className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#121624] shadow-lg ${
          checked
            ? "left-6"
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
    <div className="flex min-h-[64px] items-center gap-3 border-b border-white/[0.06] px-4 py-2.5 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2481CC]/16 text-[#7CC5FF]">
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-medium text-white">
          {title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-zinc-500">
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
      <h2 className="mb-1.5 px-3 text-[13px] font-semibold text-[#7CC5FF]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[22px] border border-[var(--fc-app-border)] bg-[#17212B]/95 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
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
  const [
    deleteConfirmOpen,
    setDeleteConfirmOpen,
  ] = useState(false);
  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] = useState("");
  const [
    deletingAccount,
    setDeletingAccount,
  ] = useState(false);

  const isConnected =
    useSocketStore(
      (state) => state.isConnected
    );
  const pushToast =
    useToastStore(
      (state) => state.pushToast
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
        title: "Security",
        rows: [
          {
            key: "loginAlerts" as const,
            icon: ShieldCheck,
            title: "Login alerts",
            detail:
              "Notify this device when a new session signs in.",
          },
          {
            key: "appLock" as const,
            icon: LockKeyhole,
            title: "App lock",
            detail:
              "Require device authentication before opening FlexChat.",
          },
        ],
      },
      {
        title: "Appearance",
        rows: [
          {
            key: "compactLists" as const,
            icon: Palette,
            title: "Compact lists",
            detail:
              "Use denser rows for conversation and contact lists.",
          },
          {
            key: "reducedMotion" as const,
            icon: Palette,
            title: "Reduced motion",
            detail:
              "Prefer simpler transitions across the interface.",
          },
        ],
      },
      {
        title: "Devices",
        rows: [
          {
            key: "deviceSync" as const,
            icon: Smartphone,
            title: "Sync active devices",
            detail:
              "Keep sessions, presence, and unread state aligned.",
          },
          {
            key: "hdCalls" as const,
            icon: Video,
            title: "HD calls",
            detail:
              "Prefer higher quality camera streams when available.",
          },
        ],
      },
      {
        title: "About",
        rows: [
          {
            key: "mediaAutoDownload" as const,
            icon: Database,
            title: "Auto-download media",
            detail:
              "Download shared media automatically on trusted networks.",
          },
          {
            key: "releaseNotes" as const,
            icon: Database,
            title: "Release notes",
            detail:
              "Show product updates and production readiness notes.",
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
      clearClientSession();
      router.replace("/auth");
    }, [router]);

  const confirmDeleteAccount =
    useCallback(async () => {
      if (
        deletingAccount ||
        deleteConfirmation !== "DELETE"
      ) {
        return;
      }

      setDeletingAccount(true);

      try {
        await deleteCurrentUser();
        clearClientSession();
        router.replace("/auth");
      } catch {
        pushToast({
          title:
            "Account deletion failed",
          message:
            "Please try again in a moment.",
          variant: "error",
        });
        setDeletingAccount(false);
      }
    }, [
      deleteConfirmation,
      deletingAccount,
      pushToast,
      router,
    ]);

  if (!user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#070B14] px-6 text-white">
        <div className="h-12 w-12 animate-spin rounded-2xl border border-[#2481CC]/25 border-t-[#7CC5FF]" />
      </main>
    );
  }

  return (
    <main className="fc-native-scroll h-dvh min-h-0 overflow-y-auto bg-[#0F1C29] px-3 py-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(var(--fc-mobile-nav-height)+1rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 sm:py-7 lg:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto flex min-h-0 max-w-2xl flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.replace("/chat")}
            className="fc-telegram-touch flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/[0.08]"
            aria-label="Back to chat"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="rounded-full border border-white/10 bg-[#17212B]/90 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-xl">
            FlexChat 1.0.0
          </div>
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            type: "spring",
            stiffness: 340,
            damping: 34,
          }}
          className="relative"
        >
          <div className="grid gap-4">
            <div className="flex flex-col gap-2.5">
              <div className="rounded-[22px] border border-[var(--fc-app-border)] bg-[#17212B]/95 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#17212B] text-3xl font-bold shadow-[0_18px_44px_rgba(0,0,0,0.25)]">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getAvatarInitial(
                        user.username
                      )
                    )}
                  </div>

                  <div className="mt-4 min-w-0">
                    <h1 className="truncate text-2xl font-semibold">
                      {user.username}
                    </h1>
                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {formatHandle(user.username)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <Link
                    href="/profile"
                    className="fc-telegram-touch group flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
                  >
                    <UserRound
                      size={18}
                      className="text-[#9BD0FF]"
                    />
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      View profile
                    </span>
                    <ChevronRight
                      size={17}
                      className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white"
                    />
                  </Link>

                  <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isConnected
                          ? "bg-[#4BA3E3] shadow-lg shadow-[#2481CC]/35"
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
                className="fc-telegram-touch flex h-12 items-center justify-center gap-2 rounded-[18px] border border-red-300/20 bg-red-500/[0.10] px-5 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
              >
                <LogOut size={18} />
                Log out
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmation("");
                  setDeleteConfirmOpen(true);
                }}
                className="fc-telegram-touch flex h-12 items-center justify-center gap-2 rounded-[18px] border border-red-300/20 bg-[#17212B]/95 px-5 text-sm font-semibold text-red-100 transition hover:bg-red-500/[0.12]"
              >
                <Trash2 size={18} />
                Delete account
              </button>
            </div>

            <div className="grid gap-4">
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
                y: 10,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.985,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 34,
              }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B111C]/[0.96] p-5 text-white shadow-lg shadow-black/30 backdrop-blur-3xl"
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
                  className="fc-telegram-touch h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogout}
                  className="fc-telegram-touch h-12 rounded-2xl bg-red-500 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmOpen ? (
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
            className="fixed inset-0 z-[285] flex items-center justify-center bg-black/[0.76] p-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.985,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 34,
              }}
              className="w-full max-w-md rounded-2xl border border-red-300/15 bg-[#0B111C]/[0.97] p-5 text-white shadow-lg shadow-black/30 backdrop-blur-3xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/25 bg-red-500/[0.16] text-red-100">
                  <Trash2 size={21} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    Delete account?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    Your profile, presence, stories, notifications, and active sessions will be removed. Existing conversations stay intact as Deleted User.
                  </p>
                </div>
              </div>

              <label
                htmlFor="delete-account-confirmation"
                className="mt-5 block text-sm font-medium text-zinc-300"
              >
                Type DELETE to continue
              </label>
              <input
                id="delete-account-confirmation"
                value={deleteConfirmation}
                onChange={(event) =>
                  setDeleteConfirmation(
                    event.target.value
                  )
                }
                disabled={deletingAccount}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-300/40 focus:bg-white/[0.06] disabled:cursor-wait disabled:opacity-70"
                autoComplete="off"
                autoCapitalize="characters"
              />

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirmOpen(false)
                  }
                  disabled={deletingAccount}
                  className="fc-telegram-touch h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-70"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void confirmDeleteAccount();
                  }}
                  disabled={
                    deletingAccount ||
                    deleteConfirmation !== "DELETE"
                  }
                  className="fc-telegram-touch flex h-12 items-center justify-center rounded-2xl bg-red-500 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingAccount ? (
                    <Loader2
                      size={18}
                      className="motion-safe:animate-spin"
                    />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
