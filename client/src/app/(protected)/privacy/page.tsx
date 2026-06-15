"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserRound,
  UserX,
  Users,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useBlockStore } from "@/store/block-store";
import { cn } from "@/lib/utils";

type VisibilityLevel = "everyone" | "contacts" | "nobody";

type PrivacySettingKey =
  | "lastSeen"
  | "onlineStatus"
  | "readReceipts"
  | "profilePhoto"
  | "bio"
  | "phoneNumber"
  | "messagePermissions";

type PrivacyState = Record<PrivacySettingKey, VisibilityLevel | boolean>;

const PRIVACY_STORAGE_KEY = "flexchat-premium-privacy";

const defaultPrivacy: PrivacyState = {
  lastSeen: "everyone",
  onlineStatus: true,
  readReceipts: true,
  profilePhoto: "everyone",
  bio: "everyone",
  phoneNumber: "contacts",
  messagePermissions: "everyone",
};

function readStoredPrivacy() {
  if (typeof window === "undefined") {
    return defaultPrivacy;
  }

  try {
    const stored = window.localStorage.getItem(PRIVACY_STORAGE_KEY);
    return stored ? { ...defaultPrivacy, ...JSON.parse(stored) } : defaultPrivacy;
  } catch {
    return defaultPrivacy;
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
      className={cn(
        "fc-touch relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200",
        checked
          ? "border-[var(--fc-primary)]/40 bg-[var(--fc-primary)] shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.2)]"
          : "border-white/10 bg-white/5"
      )}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 30,
        }}
        className={cn(
          "absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black shadow-md",
          checked ? "left-6" : "left-1"
        )}
      >
        {checked ? <Check size={12} strokeWidth={4} /> : null}
      </motion.span>
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="px-5">
        <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs font-medium text-[var(--fc-text-subtle)] opacity-70">
            {description}
          </p>
        )}
      </div>
      <div className="fc-surface overflow-hidden rounded-[24px] border border-white/10 bg-[var(--fc-app-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {children}
      </div>
    </section>
  );
}

function PrivacyRow({
  icon: Icon,
  title,
  value,
  onClick,
  isLast = false,
}: {
  icon: LucideIcon;
  title: string;
  value: string | boolean;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-h-[72px] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]",
        !isLast && "border-b border-white/[0.03]"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--fc-primary)]/10 bg-[var(--fc-primary)]/5 text-[var(--fc-primary)]">
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-bold text-white/90">{title}</h3>
      </div>

      <div className="flex items-center gap-3">
        {typeof value === "boolean" ? (
          <ToggleSwitch checked={value} onChange={onClick} label={title} />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--fc-accent-text)] capitalize">
              {value}
            </span>
            <ChevronRight size={18} className="text-[var(--fc-text-subtle)]" />
          </div>
        )}
      </div>
    </button>
  );
}

export default function PrivacyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState<PrivacyState>(readStoredPrivacy);
  const [activeSelector, setActiveSelector] = useState<{
    key: PrivacySettingKey;
    title: string;
  } | null>(null);

  const { blockedConversationIds } = useBlockStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(privacy));
  }, [privacy]);

  const toggleBoolean = (key: PrivacySettingKey) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setVisibility = (key: PrivacySettingKey, level: VisibilityLevel) => {
    setPrivacy((prev) => ({ ...prev, [key]: level }));
    setActiveSelector(null);
  };

  if (!user) return null;

  return (
    <main className="chat-safe-scroll h-[calc(100dvh-var(--fc-mobile-nav-height,4.75rem))] min-h-[calc(100svh-var(--fc-mobile-nav-height,4.75rem))] overflow-y-auto bg-[var(--fc-app-bg)] px-4 py-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 lg:h-dvh lg:min-h-svh lg:px-8 lg:pb-8 lg:pl-[calc(72px+2rem)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="fc-hover flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--fc-app-border)] text-zinc-300 transition hover:bg-white/[0.04]"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Center</h1>
        </header>

        <div className="grid gap-10">
          <Section
            title="Visibility"
            description="Control who can see your activity and status."
          >
            <PrivacyRow
              icon={Eye}
              title="Last Seen"
              value={privacy.lastSeen as string}
              onClick={() => setActiveSelector({ key: "lastSeen", title: "Last Seen" })}
            />
            <PrivacyRow
              icon={Wifi}
              title="Online Status"
              value={privacy.onlineStatus}
              onClick={() => toggleBoolean("onlineStatus")}
            />
            <PrivacyRow
              icon={ShieldCheck}
              title="Read Receipts"
              value={privacy.readReceipts}
              onClick={() => toggleBoolean("readReceipts")}
              isLast
            />
          </Section>

          <Section
            title="Profile Details"
            description="Manage visibility for your personal information."
          >
            <PrivacyRow
              icon={UserRound}
              title="Profile Photo"
              value={privacy.profilePhoto as string}
              onClick={() => setActiveSelector({ key: "profilePhoto", title: "Profile Photo" })}
            />
            <PrivacyRow
              icon={MessageSquare}
              title="Biography"
              value={privacy.bio as string}
              onClick={() => setActiveSelector({ key: "bio", title: "Biography" })}
            />
            <PrivacyRow
              icon={Smartphone}
              title="Phone Number"
              value={privacy.phoneNumber as string}
              onClick={() => setActiveSelector({ key: "phoneNumber", title: "Phone Number" })}
              isLast
            />
          </Section>

          <Section
            title="Interactions"
            description="Control who can contact and interact with you."
          >
            <PrivacyRow
              icon={Globe}
              title="Message Permissions"
              value={privacy.messagePermissions as string}
              onClick={() => setActiveSelector({ key: "messagePermissions", title: "Message Permissions" })}
            />
            <button
              type="button"
              onClick={() => router.push("/chat")} // Placeholder for future dedicated blocked list
              className="flex w-full min-h-[72px] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/10 bg-red-500/5 text-red-400">
                <UserX size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-white/90">Blocked Users</h3>
                <p className="mt-0.5 text-xs font-medium text-[var(--fc-text-subtle)]">
                  {blockedConversationIds.length} users restricted
                </p>
              </div>
              <ChevronRight size={18} className="text-[var(--fc-text-subtle)]" />
            </button>
          </Section>

          <Section
            title="Advanced Security"
            description="Extra layers of protection for your account."
          >
            <div className="flex min-h-[72px] items-center gap-4 px-5 py-3 opacity-50 grayscale cursor-not-allowed">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-[var(--fc-text-subtle)]">
                <Lock size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-white/90">End-to-End Encryption</h3>
                <p className="mt-0.5 text-xs font-medium text-[var(--fc-text-subtle)]">Coming in v1.3</p>
              </div>
              <ShieldAlert size={18} className="text-[var(--fc-text-subtle)]" />
            </div>
          </Section>
        </div>
      </div>

      <AnimatePresence>
        {activeSelector ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[280] flex items-end justify-center bg-black/90 p-4 sm:items-center sm:p-6 sm:backdrop-blur-3xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[var(--fc-modal)] overflow-hidden shadow-[0_64px_160px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
                <h2 className="text-xl font-bold tracking-tight">{activeSelector.title}</h2>
                <button
                  type="button"
                  onClick={() => setActiveSelector(null)}
                  className="fc-hover flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-1">
                {[
                  { level: "everyone", icon: Globe, label: "Everyone" },
                  { level: "contacts", icon: Users, label: "My Contacts" },
                  { level: "nobody", icon: EyeOff, label: "Nobody" },
                ].map((option) => (
                  <button
                    key={option.level}
                    type="button"
                    onClick={() => setVisibility(activeSelector.key, option.level as VisibilityLevel)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl px-4 py-4 transition-all",
                      privacy[activeSelector.key] === option.level
                        ? "bg-[var(--fc-primary)]/10 text-[var(--fc-primary)]"
                        : "text-zinc-400 hover:bg-white/[0.03]"
                    )}
                  >
                    <option.icon size={20} />
                    <span className="flex-1 text-[15px] font-bold text-left">{option.label}</span>
                    {privacy[activeSelector.key] === option.level && <Check size={20} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
