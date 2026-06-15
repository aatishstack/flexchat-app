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
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  Video,
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
import { useThemeStore } from "@/store/theme-store";
import { useToastStore } from "@/store/toast-store";

import FlexLogo from "@/components/shared/flex-logo";

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
      className={`fc-touch relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200 ${
        checked
          ? "border-[var(--fc-primary)]/40 bg-[var(--fc-primary)] shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.2)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 30,
        }}
        className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black shadow-md ${
          checked
            ? "left-6"
            : "left-1"
        }`}
      >
        {checked ? (
          <Check size={12} strokeWidth={4} />
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
    <div className="flex min-h-[72px] items-center gap-4 border-b border-white/[0.03] px-5 py-3 last:border-b-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--fc-primary)]/10 bg-[var(--fc-primary)]/5 text-[var(--fc-primary)]">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-bold text-white/90">
          {title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs font-medium leading-snug text-[var(--fc-text-subtle)]">
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
      <h2 className="mb-2 px-5 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
        {title}
      </h2>
      <div className="fc-surface overflow-hidden rounded-[24px] border border-white/10 bg-[var(--fc-app-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {children}
      </div>
    </section>
  );
}

function ThemeModeRow({
  lightMode,
  onToggle,
}: {
  lightMode: boolean;
  onToggle: () => void;
}) {
  const Icon = lightMode ? Sun : Moon;

  return (
    <div className="flex min-h-[72px] items-center gap-4 border-b border-white/[0.03] px-5 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--fc-primary)]/10 bg-[var(--fc-primary)]/5 text-[var(--fc-primary)]">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-bold text-white/90">
          Appearance Mode
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs font-medium leading-snug text-[var(--fc-text-subtle)]">
          Switch between Dark and Light interface themes.
        </p>
      </div>

      <ToggleSwitch
        checked={lightMode}
        onChange={onToggle}
        label="Appearance Mode"
      />
    </div>
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
  const theme =
    useThemeStore(
      (state) => state.theme
    );
  const setTheme =
    useThemeStore(
      (state) => state.setTheme
    );
  const lightMode =
    theme.mode === "light";

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
        title: "Communications",
        rows: [
          {
            key: "messagePreviews" as const,
            icon: Bell,
            title: "Visual Previews",
            detail:
              "Include message snippets in push notification cards.",
          },
          {
            key: "soundAlerts" as const,
            icon: Headphones,
            title: "Audio Feedback",
            detail:
              "Play high-fidelity alerts for incoming messages.",
          },
        ],
      },
      {
        title: "Experience",
        rows: [
          {
            key: "compactLists" as const,
            icon: Palette,
            title: "High Density Mode",
            detail:
              "Use tighter information density for navigation lists.",
          },
          {
            key: "reducedMotion" as const,
            icon: Palette,
            title: "Motion Optimization",
            detail:
              "Prefer subtle, high-performance transitions.",
          },
        ],
      },
      {
        title: "Advanced",
        rows: [
          {
            key: "deviceSync" as const,
            icon: Smartphone,
            title: "Cloud Sync",
            detail:
              "Keep multiple active sessions synchronized globally.",
          },
          {
            key: "hdCalls" as const,
            icon: Video,
            title: "HD Video Quality",
            detail:
              "Optimize for maximum bitrate during video calls.",
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
  const toggleThemeMode =
    useCallback(() => {
      setTheme(
        lightMode
          ? "buttermilk-blue"
          : "buttermilk-day"
      );
    }, [
      lightMode,
      setTheme,
    ]);

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
      <main className="flex min-h-dvh items-center justify-center bg-black px-6 text-white">
        <div className="h-12 w-12 animate-spin rounded-2xl border border-[var(--fc-primary)]/25 border-t-[var(--fc-primary)]" />
      </main>
    );
  }

  return (
    <>
      <main className="chat-safe-scroll h-[calc(100dvh-var(--fc-mobile-nav-height,4.75rem))] min-h-[calc(100svh-var(--fc-mobile-nav-height,4.75rem))] overflow-y-auto bg-[var(--fc-app-bg)] px-4 py-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 lg:h-dvh lg:min-h-svh lg:px-8 lg:pb-8 lg:pl-[calc(72px+2rem)]">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => router.replace("/chat")}
                className="fc-hover flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--fc-app-border)] text-zinc-300 transition hover:bg-white/[0.04]"
                aria-label="Back to chat"
              >
                <ArrowLeft size={20} />
              </button>
              <FlexLogo size="sm" />
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            </div>
            <div className="rounded-full border border-white/5 bg-white/[0.03] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--fc-text-subtle)] backdrop-blur-3xl">
              v1.2.0 Stable
            </div>
          </header>

          <section className="flex flex-col gap-8">
            <div className="fc-surface overflow-hidden rounded-[28px] border border-white/10 bg-[var(--fc-app-surface)] shadow-[0_32px_96px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-5 p-6 sm:p-8">
                <div className="fc-avatar relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-black text-3xl font-black shadow-2xl">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getAvatarInitial(user.username)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-bold tracking-tight">
                    {user.username}
                  </h2>
                  <p className="mt-1 truncate text-[14px] font-bold text-[var(--fc-accent-text)] opacity-80">
                    {formatHandle(user.username)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-[var(--fc-success)]" : "bg-amber-400 animate-pulse"}`} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--fc-text-subtle)]">
                      {isConnected ? "Synced" : "Syncing"}
                    </span>
                  </div>
                </div>

                <Link
                  href="/profile"
                  className="fc-hover flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] text-[var(--fc-primary)] transition hover:bg-white/[0.06]"
                  aria-label="Edit Profile"
                >
                  <UserRound size={22} />
                </Link>
              </div>

              <div className="grid grid-cols-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="fc-touch flex h-14 items-center justify-center gap-2.5 text-[13px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.03] hover:text-white"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmation("");
                    setDeleteConfirmOpen(true);
                  }}
                  className="fc-touch border-l border-white/5 flex h-14 items-center justify-center gap-2.5 text-[13px] font-black uppercase tracking-widest text-red-400 transition hover:bg-red-500/[0.02]"
                >
                  <Trash2 size={16} />
                  Terminate
                </button>
              </div>
            </div>

            <div className="grid gap-10">
              <Section title="Privacy Center">
                 <Link
                   href="/privacy"
                   className="flex min-h-[72px] items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.01]"
                 >
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--fc-primary)]/10 bg-[var(--fc-primary)]/5 text-[var(--fc-primary)]">
                      <ShieldCheck size={19} />
                   </div>
                   <div className="min-w-0 flex-1">
                     <h3 className="text-[15px] font-bold text-white/90">Privacy Center</h3>
                     <p className="mt-0.5 text-xs font-medium text-[var(--fc-text-subtle)]">Visibility, read receipts, and security</p>
                   </div>
                   <ChevronRight size={18} className="text-[var(--fc-text-subtle)]" />
                 </Link>
              </Section>

              {sections.map((section) => (

                <Section
                  key={section.title}
                  title={section.title}
                >
                  {section.title === "Experience" ? (
                    <ThemeModeRow
                      lightMode={lightMode}
                      onToggle={toggleThemeMode}
                    />
                  ) : null}

                  {section.rows.map((row) => (
                    <SettingRow
                      key={row.key}
                      icon={row.icon}
                      title={row.title}
                      detail={row.detail}
                      checked={settings[row.key]}
                      onToggle={() => toggleSetting(row.key)}
                    />
                  ))}
                </Section>
              ))}

              <Section title="Account & Data">
                 <div className="flex min-h-[72px] items-center gap-4 border-b border-white/[0.03] px-5 py-3 transition-colors hover:bg-white/[0.01]">
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-[var(--fc-text-subtle)]">
                      <LockKeyhole size={19} />
                   </div>
                   <div className="min-w-0 flex-1">
                     <h3 className="text-[15px] font-bold text-white/90">Passcode Lock</h3>
                     <p className="mt-0.5 text-xs font-medium text-[var(--fc-text-subtle)]">Secure your conversations</p>
                   </div>
                   <ChevronRight size={18} className="text-[var(--fc-text-subtle)]" />
                 </div>
                 <div className="flex min-h-[72px] items-center gap-4 border-b border-white/[0.03] px-5 py-3 transition-colors hover:bg-white/[0.01]">
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-[var(--fc-text-subtle)]">
                      <Database size={19} />
                   </div>
                   <div className="min-w-0 flex-1">
                     <h3 className="text-[15px] font-bold text-white/90">Data Usage</h3>
                     <p className="mt-0.5 text-xs font-medium text-[var(--fc-text-subtle)]">Manage network and storage</p>
                   </div>
                   <ChevronRight size={18} className="text-[var(--fc-text-subtle)]" />
                 </div>
              </Section>

              <Section title="Support">
                 <div className="flex min-h-[72px] items-center gap-4 border-b border-white/[0.03] px-5 py-3 transition-colors hover:bg-white/[0.01]">
                   <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-[var(--fc-text-subtle)]">
                      <AlertTriangle size={19} />
                   </div>
                   <div className="min-w-0 flex-1">
                     <h3 className="text-[15px] font-bold text-white/90">Report a Bug</h3>
                     <p className="mt-0.5 text-xs font-medium text-[var(--fc-text-subtle)]">Help us improve FlexChat</p>
                   </div>
                   <ChevronRight size={18} className="text-[var(--fc-text-subtle)]" />
                 </div>
              </Section>
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {logoutConfirmOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[280] flex items-center justify-center bg-black/90 p-6 backdrop-blur-3xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[var(--fc-modal)] p-8 text-white shadow-[0_64px_160px_rgba(0,0,0,1)]"
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--fc-primary)]/10 bg-[var(--fc-primary)]/5 text-[var(--fc-primary)]">
                  <LogOut size={28} />
                </div>

                <div className="mt-6">
                  <h2 className="text-2xl font-bold tracking-tight">Sign Out?</h2>
                  <p className="fc-muted mt-2 text-[15px] leading-relaxed">
                    Your session will end on this device. Realtime sync resumes after you sign in again.
                  </p>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="h-13 rounded-[18px] border border-white/5 bg-white/[0.03] text-[15px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.06] active:scale-95"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogout}
                  className="h-13 rounded-[18px] bg-[var(--fc-primary)] text-[15px] font-black uppercase tracking-widest text-white shadow-xl shadow-[rgba(var(--fc-primary-rgb),0.3)] transition hover:bg-[var(--fc-primary-hover)] active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[285] flex items-center justify-center bg-black/95 p-6 backdrop-blur-3xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="w-full max-w-md rounded-[28px] border border-red-500/20 bg-[var(--fc-modal)] p-10 text-white shadow-[0_64px_160px_rgba(0,0,0,1)]"
            >
              <div className="flex items-start gap-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-red-500/20 bg-red-500/10 text-red-400">
                  <Trash2 size={28} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight">Terminate Account?</h2>
                  <p className="fc-muted mt-2 text-[15px] leading-relaxed">
                    Your profile, sessions, and active presence will be permanently purged.
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-3">
                <label
                  htmlFor="delete-account-confirmation"
                  className="px-1 text-[11px] font-black uppercase tracking-[0.2em] text-red-400/80"
                >
                  Type DELETE to Confirm
                </label>
                <input
                  id="delete-account-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  disabled={deletingAccount}
                  className="h-14 w-full rounded-2xl border border-red-500/20 bg-red-500/5 px-5 text-sm font-bold text-white outline-none transition focus:border-red-500/40 focus:bg-red-500/10 disabled:opacity-50"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="DELETE"
                />
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deletingAccount}
                  className="h-13 rounded-[18px] border border-white/5 bg-white/[0.03] text-[15px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.06] active:scale-95"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void confirmDeleteAccount();
                  }}
                  disabled={deletingAccount || deleteConfirmation !== "DELETE"}
                  className="fc-touch flex h-13 items-center justify-center rounded-[18px] bg-red-500 text-[15px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-500/30 transition hover:bg-red-400 active:scale-95 disabled:opacity-40"
                >
                  {deletingAccount ? (
                    <Loader2 size={20} className="motion-safe:animate-spin" />
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
