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

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  formatHandle,
  getAvatarInitial,
} from "@/lib/user-display";
import { clearClientSession } from "@/lib/session-cleanup";
import { deleteCurrentUser } from "@/services/user.service";
import { logout as apiLogout, logoutAll as apiLogoutAll } from "@/services/auth.service";
import { tokenStorage } from "@/lib/token";
import { ShieldAlert } from "lucide-react";
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 ${
        checked
          ? "bg-[#7C4FF0] shadow-md shadow-[#7C4FF0]/30"
          : "bg-white/[0.08] border border-white/5"
      }`}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        className="absolute top-[2.5px] left-[2.5px] h-[19px] w-[19px] rounded-full bg-white shadow-sm flex items-center justify-center"
        animate={{ x: checked ? 20 : 0 }}
      >
        {checked && <div className="w-1 h-1 rounded-full bg-[#7C4FF0]" />}
      </motion.span>
    </button>
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
    <section className="flex min-w-0 flex-col gap-3">
      <div className="px-1">
        <h2 className="text-[12px] font-black uppercase tracking-[0.15em] text-white/25">
          {title}
        </h2>
      </div>
      <div className="min-w-0 overflow-hidden rounded-[28px] bg-[#16161D] border border-white/[0.03] shadow-sm">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  label,
  sub,
  checked,
  onToggle,
  isLast = false,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  checked?: boolean;
  onToggle?: () => void;
  isLast?: boolean;
}) {
  return (
    <div className={cn(
      "flex min-w-0 items-center gap-4 px-5 py-4 w-full hover:bg-white/[0.02] transition-colors",
      !isLast && "border-b border-white/[0.03]"
    )}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#7C4FF0]/10">
        <Icon size={18} className="text-[#7C4FF0]" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-[15px] font-bold text-white tracking-tight">{label}</div>
        {sub && <div className="text-[12.5px] text-white/30 font-medium mt-0.5 truncate leading-tight">{sub}</div>}
      </div>
      {onToggle !== undefined ? (
        <ToggleSwitch
          checked={!!checked}
          onChange={onToggle}
          label={label}
        />
      ) : (
        <ChevronRight size={15} className="text-white/20 flex-shrink-0" />
      )}
    </div>
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
    useCallback(async () => {
      try {
        const rt = tokenStorage.getRefreshToken();
        if (rt) {
          await apiLogout(rt);
        }
      } catch (err) {
        console.error("[AUTH] logout api error", err);
      } finally {
        clearClientSession();
        router.replace("/auth");
      }
    }, [router]);

  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = useState(false);

  const confirmLogoutAll =
    useCallback(async () => {
      try {
        await apiLogoutAll();
      } catch (err) {
        console.error("[AUTH] logout all api error", err);
      } finally {
        clearClientSession();
        router.replace("/auth");
      }
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
      <main className="flex min-h-dvh items-center justify-center bg-[#0C0C10] px-6 text-white">
        <div className="h-12 w-12 animate-spin rounded-2xl border border-[#7C4FF0]/25 border-t-[#7C4FF0]" />
      </main>
    );
  }

  return (
    <>
      <main className="fc-no-scrollbar h-dvh overflow-y-auto bg-[#0C0C10] pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex min-w-0 w-full max-w-2xl flex-col gap-5">
          <header className="px-5 pt-2 pb-3 mb-1">
            <h1 className="text-[22px] font-extrabold text-white">
              Settings
            </h1>
          </header>

          <div className="flex flex-col min-w-0 gap-5 px-4">
            <button
              onClick={() => router.push("/profile")}
              className="group flex min-w-0 items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.06] transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div className="relative shrink-0">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-black text-white overflow-hidden"
                  style={{ background: "#7C4FF0" }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    getAvatarInitial(user.username)
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[15.5px] font-bold text-white tracking-tight">{user.username}</div>
                <div className="text-[12.5px] text-white/38 font-medium mt-0.5 truncate leading-tight">
                  {formatHandle(user.username)} · {isConnected ? "Online" : "Syncing"}
                </div>
              </div>
              
              <ChevronRight size={17} className="text-white/28 flex-shrink-0" />
            </button>

            <Section title="Privacy & Security">
              <SettingRow icon={UserRound} label="Account" sub="Manage your email and sign-in details" />
              <SettingRow icon={LockKeyhole} label="Privacy" sub="Who can see your status and media" />
              <SettingRow icon={ShieldCheck} label="Security" sub="Security checks and signed-in devices" isLast />
            </Section>

            <Section title="Preferences">
              <SettingRow 
                icon={Bell} 
                label="Notifications" 
                sub="Sound, vibration and preview alerts" 
                checked={settings.messagePreviews}
                onToggle={() => toggleSetting("messagePreviews")}
              />
              <SettingRow 
                icon={Moon} 
                label="Appearance" 
                sub={lightMode ? "Light mode enabled" : "Dark mode enabled"} 
                checked={lightMode}
                onToggle={toggleThemeMode}
              />
              <SettingRow icon={Database} label="Data & Storage" sub="Auto-download and cache management" isLast />
            </Section>

            <Section title="App Support">
              <SettingRow icon={Headphones} label="Help Center" sub="FAQ and contact support" />
              <SettingRow icon={AlertTriangle} label="Report Bug" sub="Help us improve the experience" isLast />
            </Section>

            <div className="flex min-w-0 flex-col gap-3">
              <button 
                onClick={() => setLogoutConfirmOpen(true)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl hover:bg-red-500/[0.12] transition-colors"
                style={{ background: "rgba(239,68,68,0.08)" }}
              >
                <LogOut size={17} className="text-red-400" />
                <span className="text-[13.5px] font-bold text-red-400">Sign Out</span>
              </button>

              <button 
                onClick={() => setLogoutAllConfirmOpen(true)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl hover:bg-red-500/[0.12] transition-colors"
                style={{ background: "rgba(239,68,68,0.08)" }}
              >
                <ShieldAlert size={17} className="text-red-400" />
                <span className="text-[13.5px] font-bold text-red-400">Sign Out of All Devices</span>
              </button>
              
              <button 
                onClick={() => {
                  setDeleteConfirmation("");
                  setDeleteConfirmOpen(true);
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-red-400/30 transition-colors hover:text-red-400/50"
              >
                <Trash2 size={15} />
                <span className="text-[12.5px] font-bold">Delete Account</span>
              </button>
            </div>
            
            <p className="text-center text-[10.5px] text-white/18 pb-5">FlexChat 3.0.0 · © 2026 FlexCorp Ltd.</p>
          </div>
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
                    Your session will end on this device. You can sign in again anytime.
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
        {logoutAllConfirmOpen ? (
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
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-red-500/20 bg-red-500/5 text-red-400">
                  <ShieldAlert size={28} />
                </div>

                <div className="mt-6">
                  <h2 className="text-2xl font-bold tracking-tight">Sign Out Everywhere?</h2>
                  <p className="fc-muted mt-2 text-[15px] leading-relaxed">
                    This will end your sessions on all devices, including this one.
                  </p>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setLogoutAllConfirmOpen(false)}
                  className="h-13 rounded-[18px] border border-white/5 bg-white/[0.03] text-[15px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.06] active:scale-95"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogoutAll}
                  className="h-13 rounded-[18px] bg-red-500 text-[15px] font-black uppercase tracking-widest text-white shadow-xl shadow-[rgba(239,68,68,0.3)] transition hover:bg-red-600 active:scale-95"
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
                  <h2 className="text-2xl font-bold tracking-tight">Delete Account?</h2>
                  <p className="fc-muted mt-2 text-[15px] leading-relaxed">
                    Your profile and account data will be removed. This action cannot be undone.
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
