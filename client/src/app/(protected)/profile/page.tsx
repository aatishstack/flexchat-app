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

        if (avatarFile) {
          avatarUrl =
            await uploadImage(avatarFile);
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
    <main className="fc-native-scroll h-dvh min-h-0 overflow-y-auto scroll-pb-[calc(var(--fc-mobile-nav-height)+1rem+env(safe-area-inset-bottom))] bg-[#0F1C29] px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(var(--fc-mobile-nav-height)+1rem+env(safe-area-inset-bottom))] text-[var(--fc-theme-text)] sm:px-6 sm:pt-7 lg:pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto flex min-h-0 max-w-3xl flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.replace("/chat")}
            className="fc-telegram-touch flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/[0.08]"
            aria-label="Back to chat"
          >
            <ArrowLeft size={19} />
          </button>

          <Link
            href="/settings"
            className="fc-telegram-touch flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/[0.08]"
            aria-label="Open settings"
          >
            <Settings size={19} />
          </Link>
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
          className="relative overflow-hidden rounded-[22px] border border-[var(--fc-app-border)] bg-[#17212B]/95 shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
        >
          <div className="px-6 pb-7 pt-7 text-center">
            <button
              type="button"
              onClick={() =>
                setPhotoPreviewOpen(true)
              }
              className="fc-telegram-touch relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#0F1C29] text-4xl font-bold text-white"
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

            <h1 className="mt-5 text-2xl font-semibold">
              {formatDisplayName(
                profile.displayName
              )}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {formatHandle(user.username)}
            </p>

            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-zinc-300">
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
              className="fc-telegram-touch mx-auto mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-[#2481CC] px-5 text-sm font-semibold text-white transition hover:bg-[#2F8ED8]"
            >
              <PenLine size={17} />
              Edit profile
            </button>
          </div>

          <div className="border-t border-white/10 px-4 py-1 sm:px-5">
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
                  user.phoneNumber ||
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
                  className="flex min-h-[64px] items-center gap-4 border-b border-white/[0.06] py-2.5 last:border-b-0"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2481CC]/14 text-[#7CC5FF]">
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
              className="fc-telegram-touch absolute right-5 top-[calc(1rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white"
              aria-label="Close profile photo"
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{
                scale: 0.965,
              }}
              animate={{
                scale: 1,
              }}
              exit={{
                scale: 0.985,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 34,
              }}
              className="flex aspect-square w-full max-w-[min(82vw,420px)] items-center justify-center overflow-hidden rounded-full bg-[#17212B] text-6xl font-bold text-white shadow-lg shadow-black/40"
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
                y: 14,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 14,
                scale: 0.985,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 34,
              }}
              className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B111C]/[0.96] text-white shadow-lg shadow-black/30 backdrop-blur-3xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
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
                  className="fc-telegram-touch flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
                  aria-label="Close edit profile"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-safe-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                <label className="mx-auto flex w-fit cursor-pointer flex-col items-center gap-3">
                  <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/[0.15] bg-[#17212B] text-3xl font-bold">
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
                    className="fc-telegram-touch mx-auto flex h-10 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-medium text-red-100 transition hover:bg-red-500/15 disabled:cursor-wait disabled:opacity-60"
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
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#2481CC]/55 focus:bg-white/[0.07]"
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
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#2481CC]/55 focus:bg-white/[0.07]"
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
                    disabled={Boolean(user.phoneNumber)}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-[#2481CC]/55 focus:bg-white/[0.07]"
                    placeholder="+91 98765 43210"
                  />
                  {user.phoneNumber ? (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      Changing your mobile number will require OTP verification in a future update.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-white/10 p-5">
                <button
                  type="button"
                  onClick={() =>
                    setEditOpen(false)
                  }
                  disabled={savingProfile}
                  className="fc-telegram-touch h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void saveProfile();
                  }}
                  disabled={savingProfile}
                  className="fc-telegram-touch flex h-12 items-center justify-center rounded-2xl bg-[#2481CC] text-sm font-semibold text-white transition hover:bg-[#2F8ED8] disabled:cursor-wait disabled:opacity-70"
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
