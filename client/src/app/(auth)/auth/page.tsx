"use client";

import { motion } from "framer-motion";

import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  RadioTower,
  ShieldCheck,
  Video,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

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

import {
  TurnstileWidget,
  type TurnstileWidgetRef,
} from "@/components/auth/TurnstileWidget";

import PremiumInput from "@/components/ui/premium-input";

import PremiumButton from "@/components/ui/premium-button";

import FlexLogo from "@/components/shared/flex-logo";

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

  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

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
            turnstileToken,
          })
        : await register({
            username,
            email,
            password,
            turnstileToken,
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
      setTurnstileToken("");
      turnstileRef.current?.reset();
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
    (isLogin || (username.trim() && acceptedTerms)) &&
    (!turnstileSiteKey || turnstileToken),
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <FlexLogo size="lg" />
          </motion.div>

          <div className="text-center">
            <h2 className="text-lg font-bold">FlexChat</h2>

            <p className="mt-1 text-sm text-[var(--fc-text-muted)]">
              Preparing secure session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="modal-safe-scroll relative h-svh min-h-svh touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain bg-black text-white">
      <AuthBackground />

      <div className="relative z-10 grid min-h-full lg:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
        <div className="relative hidden overflow-hidden border-r border-[var(--fc-app-border)] lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--fc-primary)]/[0.08] via-transparent to-transparent" />

          <div className="relative flex w-full flex-col justify-between p-10 xl:p-16">
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
              <FlexLogo size="lg" />

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
                className="text-5xl font-bold leading-[1.1] tracking-tight xl:text-7xl"
              >
                Securely connected,
                <span className="block bg-gradient-to-r from-[var(--fc-accent-text)] to-[var(--fc-primary)] bg-clip-text text-transparent">
                  anywhere.
                </span>
              </motion.h2>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--fc-text-muted)]">
                A premium messaging experience for high-performance teams and professionals.
              </p>
            </div>

            <div className="grid gap-4">
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
                    className="flex max-w-md items-center gap-4 rounded-[22px] border border-white/5 bg-white/[0.03] p-5 shadow-2xl backdrop-blur-3xl"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[var(--fc-primary)]/20 bg-[var(--fc-primary)]/10 text-[var(--fc-primary)]">
                      <Icon size={21} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs leading-relaxed text-[var(--fc-text-muted)]">
                        {item.detail}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-h-svh items-start justify-center px-4 py-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8 lg:items-center">
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <FlexLogo size="md" />

              <div>
                <h1 className="text-xl font-bold">FlexChat</h1>
              </div>
            </div>

            <div className="mb-6 flex rounded-2xl border border-white/5 bg-white/[0.03] p-1.5 shadow-2xl backdrop-blur-3xl">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                }}
                className={`h-11 flex-1 rounded-xl text-sm font-bold transition-all ${
                  isLogin
                    ? "bg-[var(--fc-primary)] text-white shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.2)]"
                    : "text-[var(--fc-text-muted)] hover:text-white"
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
                className={`h-11 flex-1 rounded-xl text-sm font-bold transition-all ${
                  !isLogin
                    ? "bg-[var(--fc-primary)] text-white shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.2)]"
                    : "text-[var(--fc-text-muted)] hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[var(--fc-app-surface)] p-6 shadow-[0_32px_96px_rgba(0,0,0,0.8)] backdrop-blur-3xl sm:p-9">
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">
                  {isLogin ? "Welcome back" : "Create account"}
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-[var(--fc-text-muted)] sm:text-[15px]">
                  {isLogin
                    ? "Sign in to continue to your dashboard."
                    : "Join the next generation messaging platform."}
                </p>
              </div>

              <form
                className="space-y-5 sm:space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAuthSuccess();
                }}
              >
                {!isLogin && (
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-[var(--fc-text-muted)] uppercase tracking-wider">Username</label>

                    <PremiumInput
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-[var(--fc-text-muted)] uppercase tracking-wider">Email</label>

                  <PremiumInput
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-[var(--fc-text-muted)] uppercase tracking-wider">Password</label>

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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--fc-text-subtle)] transition-colors hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => {
                    setError("Bot protection failed to load. Please refresh.");
                    setTurnstileToken("")
                  }}
                />

                {error && (
                  <div className="rounded-xl border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm text-red-400">
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
                          ? "border-[var(--fc-primary)] bg-[var(--fc-primary)] text-white"
                          : "border-white/10 bg-white/[0.04] text-transparent hover:border-[var(--fc-primary)]/50"
                      }`}
                      role="checkbox"
                      aria-checked={acceptedTerms}
                      aria-label="Accept terms and privacy policy"
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>

                    <p className="text-xs leading-relaxed text-[var(--fc-text-subtle)]">
                      By creating an account you agree to our <span className="text-[var(--fc-primary)]">Terms</span> and <span className="text-[var(--fc-primary)]">Privacy Policy</span>.
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

                <div className="relative flex items-center py-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="px-4 text-[13px] font-bold text-[var(--fc-text-subtle)] uppercase">or</span>
                  <div className="h-px flex-1 bg-white/5" />
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
                  className="flex h-14 w-full items-center justify-center gap-4 rounded-[16px] border border-white/5 bg-white/[0.04] text-sm font-bold text-white shadow-2xl transition-all hover:border-[var(--fc-primary)]/30 hover:bg-[var(--fc-primary)]/[0.04] disabled:cursor-wait disabled:opacity-70"
                >
                  {googleLoading ? (
                    <Loader2 size={19} className="motion-safe:animate-spin" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-black text-black">
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
