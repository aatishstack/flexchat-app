"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Loader2,
  Mail,
  PenLine,
  Phone,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { getCurrentUser } from "@/services/auth.service";
import {
  formatDisplayName,
  formatHandle,
  getAvatarInitial,
} from "@/lib/user-display";
import { uploadMedia } from "@/services/upload.service";
import { updateCurrentUser } from "@/services/user.service";
import { useSocketStore } from "@/store/socket-store";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";

type ProfileDetails = {
  displayName: string;
  about: string;
  phone: string;
  avatar?: string | null;
};

const PROFILE_STORAGE_PREFIX =
  "flexchat-profile-details";

function profileStorageKey(userId: string) {
  return `${PROFILE_STORAGE_PREFIX}:${userId}`;
}

function createDefaultProfile(
  username: string,
  avatar?: string | null,
  phoneNumber?: string | null
): ProfileDetails {
  return {
    displayName: username,
    about:
      "Hey there! I am using FlexChat.",
    phone: phoneNumber ?? "",
    avatar: avatar ?? null,
  };
}

function readStoredProfile(user: {
  id: string;
  username: string;
  avatar?: string | null;
  phoneNumber?: string | null;
}) {
  const fallback =
    createDefaultProfile(
      user.username,
      user.avatar,
      user.phoneNumber
    );

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored =
      window.localStorage.getItem(
        profileStorageKey(user.id)
      );

    if (!stored) {
      return fallback;
    }

    const parsedProfile =
      JSON.parse(stored) as Partial<ProfileDetails>;

    return {
      ...fallback,
      ...parsedProfile,
      displayName: user.username,
      avatar: user.avatar ?? null,
      phone: user.phoneNumber ?? parsedProfile.phone ?? fallback.phone,
    };
  } catch {
    return fallback;
  }
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isConnected =
    useSocketStore(
      (state) => state.isConnected
    );
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const updateUser =
    useAuthStore(
      (state) => state.updateUser
    );
  const [
    draft,
    setDraft,
  ] = useState<ProfileDetails | null>(
    null
  );
  const [
    savedProfiles,
    setSavedProfiles,
  ] = useState<
    Record<string, ProfileDetails>
  >({});
  const [
    avatarFile,
    setAvatarFile,
  ] = useState<File | null>(null);
  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);
  const [
    editOpen,
    setEditOpen,
  ] = useState(false);
  const [
    photoPreviewOpen,
    setPhotoPreviewOpen,
  ] = useState(false);

  const profile = user
    ? savedProfiles[user.id] ??
      readStoredProfile(user)
    : null;

  useEffect(() => {
    if (!user) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setSavedProfiles((current) => {
        const existing =
          current[user.id] ?? readStoredProfile(user);
        const nextProfile = {
          ...existing,
          displayName: user.username,
          avatar: user.avatar ?? null,
        };

        try {
          window.localStorage.setItem(
            profileStorageKey(user.id),
            JSON.stringify(nextProfile)
          );
        } catch {
          // Local profile extras are non-critical; /me remains authoritative.
        }

        return {
          ...current,
          [user.id]: nextProfile,
        };
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    user,
  ]);

  const openEditModal =
    useCallback(() => {
      if (!profile) {
        return;
      }

      setDraft(profile);
      setAvatarFile(null);
      setEditOpen(true);
    }, [
      profile,
    ]);

  const saveProfile =
    useCallback(async () => {
      if (!user || !draft || savingProfile) {
        return;
      }

      try {
        setSavingProfile(true);

        const displayName =
          formatDisplayName(
            draft.displayName
              .trim()
              .slice(0, 32) ||
              user.username
          );
        let avatarUrl =
          draft.avatar !== undefined
            ? draft.avatar
            : user.avatar ?? null;
        let avatarPublicId:
          | string
          | undefined;

        if (avatarFile) {
          const uploadedAvatar =
            await uploadMedia(
              avatarFile,
              {
                purpose: "avatar",
              }
            );

          avatarUrl =
            uploadedAvatar.url;
          avatarPublicId =
            uploadedAvatar.publicId;
        }

        const shouldUpdateServer =
          displayName !== user.username ||
          avatarUrl !==
            (user.avatar ?? null) ||
          (!user.phoneNumber &&
            !!draft.phone.trim());
        const serverUser =
          shouldUpdateServer
            ? await updateCurrentUser({
                username: displayName,
                avatar: avatarUrl,
                avatarPublicId,
                ...(!user.phoneNumber &&
                draft.phone.trim()
                  ? {
                      phoneNumber:
                        draft.phone.trim(),
                    }
                  : {}),
              })
            : user;

        if (shouldUpdateServer) {
          updateUser(serverUser);
        }

        const authoritativeUser =
          shouldUpdateServer
            ? await getCurrentUser()
            : serverUser;
        const nextProfile = {
          ...draft,
          displayName:
            authoritativeUser.username,
          avatar:
            authoritativeUser.avatar ??
            avatarUrl,
          about:
            draft.about.trim(),
          phone:
            authoritativeUser.phoneNumber ??
            draft.phone.trim(),
        };

        updateUser(authoritativeUser);
        setSavedProfiles((current) => ({
          ...current,
          [user.id]: nextProfile,
        }));
        window.localStorage.setItem(
          profileStorageKey(user.id),
          JSON.stringify(nextProfile)
        );
        setAvatarFile(null);
        setEditOpen(false);
        pushToast({
          title: "Profile updated",
          message:
            avatarFile
              ? "Your profile photo and details are live."
              : "Your profile details have been saved.",
          variant: "success",
        });
      } catch {
        pushToast({
          title:
            avatarFile
              ? "Photo upload failed"
              : "Profile update failed",
          message:
            "Please try again in a moment.",
          variant: "error",
        });
      } finally {
        setSavingProfile(false);
      }
    }, [
      avatarFile,
      draft,
      pushToast,
      savingProfile,
      updateUser,
      user,
    ]);

  const handleAvatarFile =
    useCallback(
      (file?: File) => {
        if (!file || !draft) {
          return;
        }

        if (!file.type.startsWith("image/")) {
          pushToast({
            title: "Choose an image",
            message:
              "Profile photos must be image files.",
            variant: "warning",
          });
          return;
        }

        if (file.size > 2 * 1024 * 1024) {
          pushToast({
            title: "Image too large",
            message:
              "Choose a profile photo under 2 MB.",
            variant: "warning",
          });
          return;
        }

        setAvatarFile(file);

        const reader = new FileReader();

        reader.onload = () => {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  avatar:
                    typeof reader.result ===
                    "string"
                      ? reader.result
                      : current.avatar,
                }
              : current
          );
        };

        reader.readAsDataURL(file);
      },
      [
        draft,
        pushToast,
      ]
    );

  if (!user || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#070B14] px-6 text-white">
        <div className="h-12 w-12 animate-spin rounded-2xl border border-[#2481CC]/25 border-t-[#7CC5FF]" />
      </main>
    );
  }

  const avatar =
    profile.avatar ?? user.avatar;
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    : "";

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
              <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            </div>

            <Link
              href="/settings"
              className="fc-hover flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--fc-app-border)] text-zinc-300 transition hover:bg-white/[0.04]"
              aria-label="Open settings"
            >
              <Settings size={20} />
            </Link>
          </header>

          <section className="flex flex-col items-center text-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setPhotoPreviewOpen(true)}
                className="fc-touch group relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-[32px] bg-[var(--fc-app-surface)] text-5xl font-black text-white shadow-[0_48px_100px_rgba(0,0,0,0.5)] border border-white/10"
                aria-label="View profile photo"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                  />
                ) : (
                  getAvatarInitial(profile.displayName)
                )}
              </button>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-2xl border-4 border-[var(--fc-app-bg)] bg-[var(--fc-success)] shadow-xl" />
            </div>

            <div className="mt-8">
              <h2 className="text-4xl font-black tracking-tight">
                {formatDisplayName(profile.displayName)}
              </h2>
              <div className="mt-2 flex items-center justify-center gap-2 text-[15px] font-bold text-[var(--fc-accent-text)]">
                <span>{formatHandle(user.username)}</span>
                <div className="h-1 w-1 rounded-full bg-[var(--fc-accent-text)]/40" />
                <span className="opacity-70">
                  {isConnected ? "Connected" : "Syncing..."}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={openEditModal}
              className="fc-touch mt-10 flex h-13 items-center justify-center gap-3 rounded-2xl bg-[var(--fc-primary)] px-10 text-[15px] font-black uppercase tracking-widest text-white shadow-xl shadow-[rgba(var(--fc-primary-rgb),0.3)] transition hover:bg-[var(--fc-primary-hover)] active:scale-95"
            >
              <PenLine size={18} />
              Edit Profile
            </button>
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
                Bio
              </h3>
            </div>
            <div className="fc-surface rounded-[24px] border p-6">
              <p className="text-[15px] font-medium leading-relaxed text-zinc-300">
                {profile.about || "No biography provided."}
              </p>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
                Statistics
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="fc-surface flex flex-col items-center justify-center gap-2 rounded-[24px] border p-6 text-center">
                <CalendarDays size={24} className="text-[var(--fc-primary)]" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[var(--fc-text-subtle)]">
                    Member Since
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {joinedDate || "Recent"}
                  </p>
                </div>
              </div>
              <div className="fc-surface flex flex-col items-center justify-center gap-2 rounded-[24px] border p-6 text-center">
                <ShieldCheck size={24} className="text-[var(--fc-success)]" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[var(--fc-text-subtle)]">
                    Security
                  </p>
                  <p className="mt-1 text-sm font-bold">Verified Line</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
                Identity & Contact
              </h3>
            </div>
            <div className="fc-surface flex flex-col gap-1 rounded-[24px] border p-2">
              {[
                {
                  icon: Mail,
                  label: "Email",
                  value: user.email,
                },
                {
                  icon: Phone,
                  label: "Phone",
                  value: user.phoneNumber || profile.phone || "Not set",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04] text-[var(--fc-primary)]">
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-[var(--fc-text-subtle)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-[15px] font-bold">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]">
                Shared Assets
              </h3>
            </div>
            <div className="fc-surface flex items-center justify-center rounded-[24px] border border-dashed p-10 text-center">
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-[var(--fc-text-subtle)]">
                   <User size={28} />
                </div>
                <p className="mt-4 text-sm font-bold text-zinc-400">
                  Shared media and groups will appear here.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {photoPreviewOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[285] flex items-center justify-center bg-black/95 p-6 backdrop-blur-3xl"
            onClick={() => setPhotoPreviewOpen(false)}
          >
            <button
              type="button"
              onClick={() => setPhotoPreviewOpen(false)}
              className="fc-hover absolute right-6 top-[calc(1.5rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Close profile photo"
            >
              <X size={20} />
            </button>

            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="flex aspect-square w-full max-w-[480px] items-center justify-center overflow-hidden rounded-[40px] border border-white/10 bg-[var(--fc-app-panel-strong)] text-8xl font-black text-white shadow-[0_64px_160px_rgba(0,0,0,1)]"
              onClick={(event) => event.stopPropagation()}
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                getAvatarInitial(profile.displayName)
              )}
            </motion.div>
          </motion.div>
        ) : null}

        {editOpen && draft ? (
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
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[var(--fc-modal)] text-white shadow-[0_64px_160px_rgba(0,0,0,1)]"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-8 py-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Edit Profile</h2>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--fc-text-subtle)]">
                    Identity details
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="fc-hover flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-white transition hover:bg-white/[0.06]"
                  aria-label="Close edit profile"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-safe-scroll min-h-0 flex-1 space-y-8 overflow-y-auto p-8">
                <div className="flex flex-col items-center">
                  <label className="relative cursor-pointer">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-black text-5xl font-black shadow-2xl transition duration-300 hover:opacity-90">
                      {draft.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={draft.avatar}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getAvatarInitial(draft.displayName)
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                         <Camera size={24} className="text-white" />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--fc-primary)] text-white shadow-xl">
                      {savingProfile && avatarFile ? (
                        <Loader2 size={18} className="motion-safe:animate-spin" />
                      ) : (
                        <Camera size={18} />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        handleAvatarFile(event.target.files?.[0])
                      }
                    />
                  </label>

                  {draft.avatar ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setDraft({ ...draft, avatar: null });
                      }}
                      disabled={savingProfile}
                      className="mt-6 text-[13px] font-bold text-red-400 underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Remove Photo
                    </button>
                  ) : null}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <label
                      htmlFor="profile-display-name"
                      className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]"
                    >
                      Display Name
                    </label>
                    <input
                      id="profile-display-name"
                      value={draft.displayName}
                      onChange={(event) =>
                        setDraft({ ...draft, displayName: event.target.value })
                      }
                      className="h-13 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-5 text-sm font-bold text-white outline-none transition focus:border-[var(--fc-primary)]/40 focus:bg-white/[0.04]"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label
                      htmlFor="profile-about"
                      className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]"
                    >
                      Biography
                    </label>
                    <textarea
                      id="profile-about"
                      rows={3}
                      value={draft.about}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          about: event.target.value.slice(0, 140),
                        })
                      }
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-sm font-bold leading-relaxed text-white outline-none transition focus:border-[var(--fc-primary)]/40 focus:bg-white/[0.04]"
                      placeholder="Tell the world about yourself..."
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label
                      htmlFor="profile-phone"
                      className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--fc-text-subtle)]"
                    >
                      Phone Number
                    </label>
                    <input
                      id="profile-phone"
                      value={draft.phone}
                      onChange={(event) =>
                        setDraft({ ...draft, phone: event.target.value.slice(0, 32) })
                      }
                      disabled={Boolean(user.phoneNumber)}
                      className="h-13 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-5 text-sm font-bold text-white outline-none transition focus:border-[var(--fc-primary)]/40 focus:bg-white/[0.04] disabled:opacity-40"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-4 border-t border-white/5 p-8">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={savingProfile}
                  className="h-13 rounded-[18px] border border-white/5 bg-white/[0.03] text-[15px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.06] active:scale-95"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void saveProfile();
                  }}
                  disabled={savingProfile}
                  className="fc-touch flex h-13 items-center justify-center rounded-[18px] bg-[var(--fc-primary)] text-[15px] font-black uppercase tracking-widest text-white shadow-xl shadow-[rgba(var(--fc-primary-rgb),0.3)] transition hover:bg-[var(--fc-primary-hover)] active:scale-95 disabled:cursor-wait disabled:opacity-60"
                >
                  {savingProfile ? (
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
