"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  Video,
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
      <main className="flex min-h-dvh items-center justify-center bg-[#0C0C10] px-6 text-white">
        <div className="h-12 w-12 animate-spin rounded-2xl border border-[#7C4FF0]/25 border-t-[#7C4FF0]" />
      </main>
    );
  }

  const memberSince = useMemo(() => {
    if (!user.createdAt) return "January 2026";
    try {
      return new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "January 2026";
    }
  }, [user.createdAt]);

  const avatar =
    profile.avatar ?? user.avatar;

  return (
    <>
      <main className="fc-no-scrollbar h-dvh overflow-y-auto bg-[#0C0C10] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between px-3 py-2 mb-4">
            <button
              onClick={() => router.replace("/settings")}
              className="p-2"
            >
              <ArrowLeft size={21} className="text-white/65" />
            </button>
            <h2 className="flex-1 text-center text-[16px] font-bold text-white">Profile</h2>
            <button
              onClick={openEditModal}
              className="p-2"
            >
              <PenLine size={20} className="text-white/65" />
            </button>
          </div>

          {/* Identity Presentation */}
          <div className="flex flex-col items-center px-5 pt-4 pb-6">
            <button
              onClick={() => setPhotoPreviewOpen(true)}
              className="w-[90px] h-[90px] rounded-full flex items-center justify-center overflow-hidden mb-3 relative group"
              style={{
                boxShadow: "0 0 0 4px rgba(124,79,240,0.25), 0 0 0 8px rgba(124,79,240,0.08)"
              }}
            >
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-[32px] font-black text-white"
                  style={{ background: "linear-gradient(135deg, #7C4FF0, #A78BFA)" }}
                >
                  {getAvatarInitial(profile.displayName)}
                </div>
              )}
            </button>
            <h2 className="text-[22px] font-extrabold text-white">
              {formatDisplayName(profile.displayName)}
            </h2>
            <p className="text-[13px] text-white/42 mt-1 font-medium text-center px-4 max-w-sm">
              {profile.about || "Hey there! I am using FlexChat."}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-zinc-500"}`} />
              <span className={`text-[12px] font-semibold ${isConnected ? "text-emerald-400" : "text-zinc-500"}`}>
                {isConnected ? "Online now" : "Offline"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mx-5 mb-6">
            {[
              { icon: Phone, label: "Call", fn: () => {} },
              { icon: Video, label: "Video", fn: () => {} },
              { icon: ShieldCheck, label: "Secure", fn: () => {} }
            ].map(({ icon: Icon, label, fn }) => (
              <button
                key={label}
                onClick={fn}
                className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl hover:bg-white/[0.07] transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Icon size={19} style={{ color: "#7C4FF0" }} />
                <span className="text-[11.5px] text-white/55 font-semibold">{label}</span>
              </button>
            ))}
          </div>

          {/* Info rows */}
          <div className="mx-5 rounded-2xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.04)" }}>
            {[
              { label: "Email", value: user.email },
              { label: "Phone", value: user.phoneNumber || profile.phone || "Not configured" },
              { label: "Username", value: formatHandle(user.username) },
              { label: "Member since", value: memberSince },
            ].map(({ label, value }, i) => (
              <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}>
                <span className="text-[12.5px] text-white/38 font-semibold">{label}</span>
                <span className="text-[13.5px] text-white font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Shared Content */}
          <div className="mx-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13.5px] font-bold text-white">Shared Media</span>
              <button className="text-[12.5px] font-semibold" style={{ color: "#7C4FF0" }}>See all</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {["#7C4FF0", "#C8376A", "#2563EB", "#059669", "#D97706", "#7C3AED"].map((col, i) => (
                <div key={i} className="aspect-square rounded-xl" style={{ background: col, opacity: 0.65 + i * 0.05 }} />
              ))}
            </div>
          </div>
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
