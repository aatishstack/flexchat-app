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
  Wifi,
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
import { uploadImage } from "@/services/upload.service";
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
  avatar?: string | null
): ProfileDetails {
  return {
    displayName: username,
    about:
      "Hey there! I am using FlexChat.",
    phone: "",
    avatar: avatar ?? null,
  };
}

function readStoredProfile(user: {
  id: string;
  username: string;
  avatar?: string | null;
}) {
  const fallback =
    createDefaultProfile(
      user.username,
      user.avatar
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

        if (avatarFile) {
          avatarUrl =
            await uploadImage(avatarFile);
        }

        const shouldUpdateServer =
          displayName !== user.username ||
          avatarUrl !==
            (user.avatar ?? null);
        const serverUser =
          shouldUpdateServer
            ? await updateCurrentUser({
                username: displayName,
                avatar: avatarUrl,
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
        <div className="h-12 w-12 animate-spin rounded-2xl border border-purple-400/25 border-t-purple-300" />
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
    <main className="modal-safe-scroll h-dvh min-h-svh overflow-y-auto bg-[var(--fc-app-bg)] px-4 py-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-3xl flex-col">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.replace("/chat")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200 shadow-lg shadow-black/20 backdrop-blur-xl transition hover:bg-white/[0.09]"
            aria-label="Back to chat"
          >
            <ArrowLeft size={19} />
          </button>

          <Link
            href="/settings"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200 shadow-lg shadow-black/20 backdrop-blur-xl transition hover:bg-white/[0.09]"
            aria-label="Open settings"
          >
            <Settings size={19} />
          </Link>
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

          <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-cyan-500 px-6 pb-9 pt-10 text-center">
            <button
              type="button"
              onClick={() =>
                setPhotoPreviewOpen(true)
              }
              className="relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[36px] border border-white/25 bg-white/[0.15] text-4xl font-bold shadow-2xl shadow-black/25"
              aria-label="View profile photo"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getAvatarInitial(
                  profile.displayName
                )
              )}
              <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-white bg-green-400 shadow-lg shadow-green-500/40" />
            </button>

            <h1 className="mt-5 text-3xl font-bold">
              {formatDisplayName(
                profile.displayName
              )}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {formatHandle(user.username)}
            </p>

            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/[0.18] px-3 py-1.5 text-xs text-white/90 backdrop-blur-xl">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? "bg-green-300"
                    : "bg-amber-300"
                }`}
              />
              {isConnected
                ? "Realtime online"
                : "Reconnecting"}
            </div>

            <button
              type="button"
              onClick={openEditModal}
              className="mx-auto mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#381052] shadow-xl shadow-black/20 transition hover:scale-[1.02]"
            >
              <PenLine size={17} />
              Edit profile
            </button>
          </div>

          <div className="grid gap-3 p-5 sm:p-6">
            {[
              {
                icon: Mail,
                label: "Email",
                value: user.email,
              },
              {
                icon: Phone,
                label: "Phone",
                value:
                  profile.phone ||
                  "Not added",
              },
              {
                icon: User,
                label: "About",
                value:
                  profile.about ||
                  "No status set",
              },
              {
                icon: Wifi,
                label: "Presence",
                value: isConnected
                  ? "Connected"
                  : "Waiting for realtime sync",
              },
              {
                icon: ShieldCheck,
                label: "Session",
                value: "JWT secured",
              },
              {
                icon: CalendarDays,
                label: "Joined",
                value: joinedDate || "Not available",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_14px_45px_rgba(0,0,0,0.18)] transition hover:border-purple-300/20 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-purple-300/[0.15] bg-purple-500/[0.12] text-purple-100">
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">
                      {item.label}
                    </p>
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      <AnimatePresence>
        {photoPreviewOpen ? (
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
            className="fixed inset-0 z-[285] flex items-center justify-center bg-black/[0.86] p-5 backdrop-blur-xl"
            onClick={() =>
              setPhotoPreviewOpen(false)
            }
          >
            <button
              type="button"
              onClick={() =>
                setPhotoPreviewOpen(false)
              }
              className="absolute right-5 top-[calc(1rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white"
              aria-label="Close profile photo"
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{
                scale: 0.92,
              }}
              animate={{
                scale: 1,
              }}
              exit={{
                scale: 0.92,
              }}
              className="flex aspect-square w-full max-w-[min(82vw,420px)] items-center justify-center overflow-hidden rounded-[42px] bg-gradient-to-br from-purple-600 to-fuchsia-600 text-6xl font-bold text-white shadow-[0_32px_100px_rgba(0,0,0,0.7)]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getAvatarInitial(
                  profile.displayName
                )
              )}
            </motion.div>
          </motion.div>
        ) : null}

        {editOpen && draft ? (
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
            className="fixed inset-0 z-[280] flex items-end justify-center bg-black/[0.72] p-3 backdrop-blur-xl sm:items-center sm:p-4"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 28,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 28,
                scale: 0.96,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 28,
              }}
              className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#0B111C]/[0.96] text-white shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    Edit profile
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    FlexChat identity
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditOpen(false)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
                  aria-label="Close edit profile"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-safe-scroll max-h-[min(68dvh,620px)] space-y-4 p-5">
                <label className="mx-auto flex w-fit cursor-pointer flex-col items-center gap-3">
                  <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[30px] border border-white/[0.15] bg-gradient-to-br from-purple-600 to-fuchsia-600 text-3xl font-bold shadow-2xl shadow-purple-600/25">
                    {draft.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getAvatarInitial(
                        draft.displayName
                      )
                    )}
                    <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#381052] shadow-lg">
                      {savingProfile &&
                      avatarFile ? (
                        <Loader2
                          size={15}
                          className="motion-safe:animate-spin"
                        />
                      ) : (
                        <Camera size={15} />
                      )}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      handleAvatarFile(
                        event.target.files?.[0]
                      )
                    }
                  />
                </label>

                {draft.avatar ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setDraft({
                        ...draft,
                        avatar: null,
                      });
                    }}
                    disabled={savingProfile}
                    className="mx-auto flex h-10 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-medium text-red-100 transition hover:bg-red-500/15 disabled:cursor-wait disabled:opacity-60"
                  >
                    Remove photo
                  </button>
                ) : null}

                <div className="space-y-2">
                  <label
                    htmlFor="profile-display-name"
                    className="text-sm text-zinc-300"
                  >
                    Display name
                  </label>
                  <input
                    id="profile-display-name"
                    value={draft.displayName}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        displayName:
                          event.target.value,
                      })
                    }
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-purple-400/45 focus:bg-white/[0.07]"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="profile-about"
                    className="text-sm text-zinc-300"
                  >
                    About
                  </label>
                  <textarea
                    id="profile-about"
                    rows={3}
                    value={draft.about}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        about:
                          event.target.value.slice(
                            0,
                            140
                          ),
                      })
                    }
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/45 focus:bg-white/[0.07]"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="profile-phone"
                    className="text-sm text-zinc-300"
                  >
                    Phone
                  </label>
                  <input
                    id="profile-phone"
                    value={draft.phone}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        phone:
                          event.target.value.slice(
                            0,
                            32
                          ),
                      })
                    }
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-purple-400/45 focus:bg-white/[0.07]"
                    placeholder="+1 555 0100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-5">
                <button
                  type="button"
                  onClick={() =>
                    setEditOpen(false)
                  }
                  disabled={savingProfile}
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void saveProfile();
                  }}
                  disabled={savingProfile}
                  className="flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-sm font-semibold text-white shadow-xl shadow-purple-600/25 transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
                >
                  {savingProfile ? (
                    <Loader2
                      size={18}
                      className="motion-safe:animate-spin"
                    />
                  ) : (
                    "Save"
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
