"use client";

import { motion } from "framer-motion";

import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  RadioTower,
  ShieldCheck,
  Video,
} from "lucide-react";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import axios from "axios";

import { FirebaseError } from "firebase/app";

import {
  signInWithRedirect,
} from "firebase/auth";

import { useSocketStore } from "@/store/socket-store";

import { useToastStore } from "@/store/toast-store";

import { useAuth } from "@/hooks/useAuth";

import { useAuthStore } from "@/stores/auth.store";

import {
  getFirebaseAuth,
  getGoogleProvider,
} from "@/lib/firebase";

import { tokenStorage } from "@/lib/token";

import {
  login,
  register,
} from "@/services/auth.service";

import AuthBackground from "@/components/auth/auth-background";

import PremiumInput from "@/components/ui/premium-input";

import PremiumButton from "@/components/ui/premium-button";

export default function AuthPage() {
  const router = useRouter();

  const { connectSocket } = useSocketStore();

  const { isAuthenticated, isHydrated } = useAuth();

  const setAuth = useAuthStore((state) => state.setAuth);

  const pushToast = useToastStore(
    (state) => state.pushToast,
  );

  const [isLogin, setIsLogin] = useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated) {
      router.replace("/chat");
    }
  }, [isAuthenticated, isHydrated, router]);

  async function handleAuthSuccess() {
    if (loading || googleLoading) {
      return;
    }

    if (!isLogin && !acceptedTerms) {
      setError(
        "Please accept the terms to create your account.",
      );

      return;
    }

    try {
      setLoading(true);

      setError("");

      const response = isLogin
        ? await login({
            email,
            password,
          })
        : await register({
            username,
            email,
            password,
          });

      tokenStorage.set(response.token);

      setAuth({
        user: response.user,
        token: response.token,
      });

      connectSocket(response.token);

      router.push("/chat");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.message ||
            "Authentication failed",
        );
      } else {
        setError("Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (loading || googleLoading) {
      return;
    }

    try {
      setGoogleLoading(true);

      setError("");

      await signInWithRedirect(
        getFirebaseAuth(),
        getGoogleProvider(),
      );

      return;
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : error instanceof FirebaseError
          ? error.message
          : "Please try again in a moment.";

      pushToast({
        title: "Google sign-in failed",
        message,
        variant: "error",
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  const canSubmit = Boolean(
    email.trim() &&
      password.trim() &&
      (isLogin ||
        (username.trim() && acceptedTerms)),
  );

  const featureItems = [
    {
      icon: RadioTower,
      title: "Realtime Sync",
      detail:
        "Live delivery, typing, and presence across devices.",
    },
    {
      icon: Video,
      title: "Voice and Video",
      detail:
        "WebRTC calls with production STUN/TURN support.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Sessions",
      detail:
        "Persistent JWT auth with reconnect recovery.",
    },
  ];

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-white">
        <div className="flex flex-col items-center gap-5">
          <div className="h-14 w-14 animate-spin rounded-2xl border border-purple-500/30 border-t-purple-400" />

          <div className="text-center">
            <h2 className="text-lg font-semibold">
              Loading FlexChat
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Preparing secure session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="modal-safe-scroll relative h-svh min-h-svh touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain bg-[#050510] text-white">
      <AuthBackground />

      <div className="relative z-10 grid min-h-full lg:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
        <div className="relative hidden overflow-hidden border-r border-white/10 lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/[0.12] via-transparent to-cyan-400/[0.08]" />

          <div className="relative flex w-full flex-col justify-between p-10 xl:p-12">
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="flex items-center gap-4"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600 shadow-lg shadow-purple-600/30">
                <MessageCircle size={28} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  FlexChat
                </h1>

                <p className="text-sm text-zinc-400">
                  Premium Messaging Platform
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="flex min-h-svh items-start justify-center px-4 py-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-[calc(2rem+env(safe-area-inset-top))] lg:items-center">
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="w-full max-w-[440px]"
          >
            <div className="rounded-[28px] border border-white/10 bg-[#0B111C]/[0.82] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.45),0_0_60px_rgba(124,58,237,0.13)] backdrop-blur-3xl sm:rounded-[34px] sm:p-7">
              <div className="mb-5 sm:mb-7">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {isLogin
                    ? "Welcome back"
                    : "Create account"}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
                  {isLogin
                    ? "Sign in to continue your conversations."
                    : "Join the next generation messaging platform."}
                </p>
              </div>

              <form
                className="space-y-4 sm:space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();

                  void handleAuthSuccess();
                }}
              >
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-300">
                      Username
                    </label>

                    <PremiumInput
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value)
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">
                    Email
                  </label>

                  <PremiumInput
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">
                    Password
                  </label>

                  <div className="relative">
                    <PremiumInput
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder={
                        isLogin
                          ? "Enter password"
                          : "Create password"
                      }
                      className="pr-12"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword,
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <PremiumButton
                  type="submit"
                  loading={loading}
                  disabled={
                    loading ||
                    googleLoading ||
                    !canSubmit
                  }
                >
                  {isLogin
                    ? "Sign In"
                    : "Create Account"}
                </PremiumButton>

                <motion.button
                  type="button"
                  whileHover={{
                    scale:
                      loading || googleLoading
                        ? 1
                        : 1.01,
                  }}
                  whileTap={{
                    scale:
                      loading || googleLoading
                        ? 1
                        : 0.98,
                  }}
                  onClick={() => {
                    void handleGoogleSignIn();
                  }}
                  disabled={loading || googleLoading}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-semibold text-white shadow-[0_16px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-purple-300/30 hover:bg-purple-500/[0.10] disabled:cursor-wait disabled:opacity-70"
                >
                  {googleLoading ? (
                    <Loader2
                      size={19}
                      className="motion-safe:animate-spin"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-bold text-[#171923]">
                      G
                    </span>
                  )}

                  Continue with Google
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}