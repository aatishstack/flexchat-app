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

import {
  usePathname,
  useRouter,
} from "next/navigation";

import axios from "axios";
import { z } from "zod";

import { useSocketStore } from "@/store/socket-store";
import { useToastStore } from "@/store/toast-store";

import { useAuth } from "@/hooks/useAuth";

import { useAuthStore } from "@/stores/auth.store";

import { tokenStorage } from "@/lib/token";

import {
  getOAuthApiBaseUrl,
  getGoogleOAuthStartUrl,
  login,
  register,
  type AuthResponse,
} from "@/services/auth.service";

import AuthBackground from "@/components/auth/auth-background";

import PremiumInput from "@/components/ui/premium-input";

import PremiumButton from "@/components/ui/premium-button";

function getAuthenticationErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (
      !error.response ||
      (error.response.status >= 500 &&
        error.response.status <= 599)
    ) {
      return "Authentication service is temporarily unavailable. Please retry.";
    }

    return (
      error.response?.data?.message ||
      "Authentication failed"
    );
  }

  return "Authentication failed";
}

const googleOAuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  avatar: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
}) satisfies z.ZodType<AuthResponse["user"]>;

const googleOAuthMessageSchema = z.discriminatedUnion("type", [
  z.object({
    source: z.literal("flexchat-google-oauth"),
    type: z.literal("flexchat:google-auth:success"),
    token: z.string().min(1),
    user: googleOAuthUserSchema,
  }),
  z.object({
    source: z.literal("flexchat-google-oauth"),
    type: z.literal("flexchat:google-auth:error"),
    message: z.string().optional(),
  }),
]);

type GoogleOAuthMessage = z.infer<typeof googleOAuthMessageSchema>;

function parseGoogleOAuthMessage(value: unknown): GoogleOAuthMessage | null {
  const parsedMessage = googleOAuthMessageSchema.safeParse(value);

  return parsedMessage.success ? parsedMessage.data : null;
}

function getAllowedGoogleOAuthOrigins() {
  const origins = new Set<string>([window.location.origin]);
  const apiOrigins = [
    getOAuthApiBaseUrl(),
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_SOCKET_URL,
  ];

  apiOrigins.forEach((apiOrigin) => {
    if (!apiOrigin) {
      return;
    }

    try {
      origins.add(new URL(apiOrigin).origin);
    } catch {
      return;
    }
  });

  return origins;
}

function openGoogleOAuthPopup() {
  const popupWidth = 500;
  const popupHeight = 640;
  const left =
    window.screenX + Math.max(0, (window.outerWidth - popupWidth) / 2);
  const top =
    window.screenY + Math.max(0, (window.outerHeight - popupHeight) / 2);
  const popup = window.open(
    getGoogleOAuthStartUrl(),
    "flexchat-google-oauth",
    [
      "popup=yes",
      `width=${popupWidth}`,
      `height=${popupHeight}`,
      `left=${Math.round(left)}`,
      `top=${Math.round(top)}`,
      "resizable=yes",
      "scrollbars=yes",
    ].join(","),
  );

  if (!popup) {
    throw new Error("Allow popups to continue with Google.");
  }

  popup.focus();

  return popup;
}

export default function AuthPage() {
  const router = useRouter();
  const pathname = usePathname();

  const connectSocket = useSocketStore(
    (state) => state.connectSocket,
  );

  const { isAuthenticated, isHydrated } = useAuth();

  const setAuth = useAuthStore((state) => state.setAuth);
  const pushToast = useToastStore((state) => state.pushToast);

  const [isLogin, setIsLogin] = useState(true);

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated) {
      console.info("[ROUTER] redirect executing", {
        from: pathname,
        to: "/chat",
        reason: "auth_page_already_authenticated",
      });
      router.replace("/chat");
    }
  }, [isAuthenticated, isHydrated, pathname, router]);

  function completeAuthSession(response: AuthResponse, source: string) {
    console.info("[AUTH] token extracted", {
      source,
      hasToken: Boolean(response.token),
      userId: response.user.id,
    });

    tokenStorage.set(response.token);
    console.info("[AUTH] token stored", {
      source,
      storage: "localStorage",
      currentPathname:
        typeof window !== "undefined"
          ? window.location.pathname
          : pathname,
    });

    setAuth({
      user: response.user,
      token: response.token,
    });
    console.info("[AUTH] auth store updated", {
      source,
      userId: response.user.id,
      hydrated: true,
    });

    connectSocket(response.token);
    console.info("[SOCKET] socket auth token attached", {
      source,
      hasToken: Boolean(response.token),
    });

    console.info("[ROUTER] redirect executing", {
      from:
        typeof window !== "undefined"
          ? window.location.pathname
          : pathname,
      to: "/chat",
      source,
    });
    router.replace("/chat");
  }

  async function handleAuthSuccess() {
    if (loading || googleLoading) {
      return;
    }

    if (!isLogin && !acceptedTerms) {
      setError("Please accept the terms to create your account.");
      return;
    }

    try {
      setLoading(true);

      setError("");
      console.info("[AUTH] credential sign-in started", {
        mode: isLogin ? "login" : "register",
      });

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

      completeAuthSession(response, isLogin ? "login" : "register");

      console.info("[AUTH] credential sign-in succeeded", {
        userId: response.user.id,
      });
    } catch (error: unknown) {
      console.error("[AUTH] credential sign-in failed", {
        status: axios.isAxiosError(error)
          ? error.response?.status ?? "network_error"
          : "client_error",
        message:
          error instanceof Error
            ? error.message
            : "Unknown sign-in failure",
      });
      setError(getAuthenticationErrorMessage(error));
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
      const startUrl = getGoogleOAuthStartUrl();

      console.info("[OAUTH] popup opened", {
        startUrl,
        currentPathname: pathname,
      });

      const response = await new Promise<AuthResponse>((resolve, reject) => {
        const allowedOrigins = getAllowedGoogleOAuthOrigins();
        let settled = false;
        const popup = openGoogleOAuthPopup();

        function cleanup() {
          window.clearTimeout(timeoutTimer);
          window.clearInterval(closeCheckTimer);
          window.removeEventListener("message", handleMessage);
        }

        function settleWithSuccess(authResponse: AuthResponse) {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          resolve(authResponse);
        }

        function settleWithError(error: Error) {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          reject(error);
        }

        function handleMessage(event: MessageEvent<unknown>) {
          console.info("[OAUTH] popup message received", {
            origin: event.origin,
            allowed: allowedOrigins.has(event.origin),
            currentPathname:
              typeof window !== "undefined"
                ? window.location.pathname
                : pathname,
          });

          if (!allowedOrigins.has(event.origin)) {
            console.warn(
              "[OAUTH] ignored Google OAuth message from unknown origin",
              {
                origin: event.origin,
                allowedOrigins: Array.from(allowedOrigins),
              },
            );
            return;
          }

          const message = parseGoogleOAuthMessage(event.data);

          if (!message) {
            console.warn("[OAUTH] ignored malformed Google OAuth message", {
              origin: event.origin,
            });
            return;
          }

          if (message.type === "flexchat:google-auth:error") {
            console.warn("[OAUTH] popup callback error", {
              message: message.message,
            });
            settleWithError(
              new Error(message.message ?? "Google sign-in failed."),
            );
            return;
          }

          console.info("[OAUTH] popup callback success", {
            userId: message.user.id,
            hasToken: Boolean(message.token),
          });
          settleWithSuccess({
            token: message.token,
            user: message.user,
          });
        }

        window.addEventListener("message", handleMessage);

        const timeoutTimer = window.setTimeout(() => {
          settleWithError(new Error("Google sign-in timed out."));
          popup?.close();
        }, 90_000);

        const closeCheckTimer = window.setInterval(() => {
          if (popup?.closed) {
            settleWithError(new Error("Google sign-in was canceled."));
          }
        }, 700);
      });

      completeAuthSession(response, "google");

      console.info("[OAUTH] Google OAuth sign-in succeeded", {
        userId: response.user.id,
      });
      pushToast({
        title: "Welcome to FlexChat",
        message: "Google sign-in connected securely.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Please try again in a moment.";

      console.error("[OAUTH] Google OAuth sign-in failed", {
        message,
      });

      pushToast({
        title:
          message === "Google sign-in was canceled."
            ? "Google sign-in canceled"
            : "Google sign-in failed",
        message,
        variant:
          message === "Google sign-in was canceled."
            ? "info"
            : "error",
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  const canSubmit = Boolean(
    email.trim() &&
    password.trim() &&
    (isLogin || (username.trim() && acceptedTerms)),
  );

  const featureItems = [
    {
      icon: RadioTower,
      title: "Realtime Sync",
      detail: "Live delivery, typing, and presence across devices.",
    },
    {
      icon: Video,
      title: "Voice and Video",
      detail: "WebRTC calls with production STUN/TURN support.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Sessions",
      detail: "Persistent JWT auth with reconnect recovery.",
    },
  ];

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] text-white">
        <div className="flex flex-col items-center gap-5">
          <div className="h-14 w-14 animate-spin rounded-2xl border border-sky-500/30 border-t-sky-400" />

          <div className="text-center">
            <h2 className="text-lg font-semibold">Loading FlexChat</h2>

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
          <div className="absolute inset-0 bg-gradient-to-br from-sky-600/[0.12] via-transparent to-cyan-400/[0.08]" />

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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2481CC] shadow-lg shadow-sky-700/25">
                <MessageCircle size={28} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">FlexChat</h1>
              </div>
            </motion.div>

            <div className="max-w-xl">
              <motion.h2
                initial={{
                  opacity: 0,
                  y: 18,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.08,
                }}
                className="text-5xl font-bold leading-tight tracking-tight xl:text-6xl"
              >
                Secure messaging,
                <span className="block bg-gradient-to-r from-sky-200 via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                  realtime by design.
                </span>
              </motion.h2>

              <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">
                A polished chat workspace with live presence, stories, calls,
                uploads, and resilient reconnect behavior.
              </p>
            </div>

            <div className="grid gap-3">
              {featureItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.title}
                    initial={{
                      opacity: 0,
                      x: -14,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay: 0.12 + index * 0.06,
                    }}
                    className="flex max-w-md items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-500/[0.14] text-sky-50">
                      <Icon size={21} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        {item.detail}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
            <div className="mb-5 flex items-center justify-center gap-3 sm:mb-7 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2481CC] to-[#2F8ED8] shadow-lg shadow-sky-700/25">
                <MessageCircle size={24} />
              </div>

              <div>
                <h1 className="text-xl font-bold">FlexChat</h1>
              </div>
            </div>

            <div className="mb-4 flex rounded-2xl border border-white/10 bg-white/[0.035] p-1 shadow-xl shadow-black/20 backdrop-blur-2xl sm:mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                }}
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition-all ${
                  isLogin
                    ? "bg-gradient-to-r from-[#2481CC] to-[#2F8ED8] text-white shadow-lg shadow-sky-700/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                }}
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition-all ${
                  !isLogin
                    ? "bg-gradient-to-r from-[#2481CC] to-[#2F8ED8] text-white shadow-lg shadow-sky-700/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#0B111C]/[0.82] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.45),0_0_60px_rgba(36,129,204,0.13)] backdrop-blur-3xl sm:rounded-[34px] sm:p-7">
              <div className="mb-5 sm:mb-7">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {isLogin ? "Welcome back" : "Create account"}
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
                    <label className="text-sm text-zinc-300">Username</label>

                    <PremiumInput
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">Email</label>

                  <PremiumInput
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">Password</label>

                  <div className="relative">
                    <PremiumInput
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        isLogin ? "Enter password" : "Create password"
                      }
                      className="pr-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {!isLogin && (
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setAcceptedTerms((value) => !value)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        acceptedTerms
                          ? "border-sky-300 bg-[#2481CC] text-white"
                          : "border-white/[0.15] bg-white/[0.04] text-transparent hover:border-sky-300/50"
                      }`}
                      role="checkbox"
                      aria-checked={acceptedTerms}
                      aria-label="Accept terms and privacy policy"
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>

                    <p className="text-xs leading-relaxed text-zinc-500">
                      By creating an account you agree to our Terms and Privacy
                      Policy.
                    </p>
                  </div>
                )}

                <PremiumButton
                  type="submit"
                  loading={loading}
                  disabled={loading || googleLoading || !canSubmit}
                >
                  {isLogin ? "Sign In" : "Create Account"}
                </PremiumButton>

                <div className="relative flex items-center py-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="px-3 text-xs text-zinc-500">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <motion.button
                  type="button"
                  whileHover={{
                    scale: loading || googleLoading ? 1 : 1.01,
                  }}
                  whileTap={{
                    scale: loading || googleLoading ? 1 : 0.98,
                  }}
                  onClick={() => {
                    void handleGoogleSignIn();
                  }}
                  disabled={loading || googleLoading}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-semibold text-white shadow-[0_16px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-sky-300/30 hover:bg-sky-500/[0.10] disabled:cursor-wait disabled:opacity-70"
                >
                  {googleLoading ? (
                    <Loader2 size={19} className="motion-safe:animate-spin" />
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
