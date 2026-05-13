"use client";

import { motion } from "framer-motion";

import {
  Eye,
  EyeOff,
  MessageCircle,
  Shield,
  Sparkles,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { useSocketStore } from "@/store/socket-store";

import { useAuth } from "@/hooks/useAuth";

import { useAuthStore } from "@/stores/auth.store";

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

  const { connectSocket } =
    useSocketStore();

  const {
    isAuthenticated,
    isHydrated,
  } = useAuth();

  const setAuth =
    useAuthStore(
      (state) => state.setAuth
    );

  const [isLogin, setIsLogin] =
    useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated) {
      router.replace("/chat");
    }
  }, [
    isAuthenticated,
    isHydrated,
    router,
  ]);

  async function handleAuthSuccess() {
    try {
      setLoading(true);

      setError("");

      const response =
        isLogin
          ? await login({
              email,
              password,
            })
          : await register({
              username,
              email,
              password,
            });

      tokenStorage.set(
        response.token
      );

      setAuth({
        user:
          response.user,

        token:
          response.token,
      });

      connectSocket(
        response.token
      );

      router.push("/chat");
    } catch (
      error: any
    ) {
      setError(
        error?.response?.data
          ?.message ||
          "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  }

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
    <main className="relative min-h-screen overflow-hidden bg-[#07070a] text-white">
      <AuthBackground />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* LEFT SIDE */}
        <div className="relative hidden overflow-hidden border-r border-white/10 lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-fuchsia-500/10" />

          <div className="relative flex w-full flex-col justify-between p-12">
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

            <div className="max-w-lg">
              <motion.h2
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.1,
                }}
                className="text-6xl font-bold leading-tight tracking-tight"
              >
                Chat smarter.
                <br />
                Connect faster.
              </motion.h2>

              <motion.p
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.2,
                }}
                className="mt-6 text-lg leading-relaxed text-zinc-400"
              >
                Secure realtime messaging with modern
                design, lightning-fast performance and
                premium communication experience.
              </motion.p>

              <div className="mt-10 space-y-4">
                <motion.div
                  initial={{
                    opacity: 0,
                    x: -15,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay: 0.3,
                  }}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl"
                >
                  <div className="rounded-xl bg-purple-500/20 p-3">
                    <Shield size={22} />
                  </div>

                  <div>
                    <h3 className="font-medium">
                      End-to-End Security
                    </h3>

                    <p className="text-sm text-zinc-400">
                      Protected conversations and
                      encrypted messaging.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{
                    opacity: 0,
                    x: -15,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay: 0.4,
                  }}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl"
                >
                  <div className="rounded-xl bg-fuchsia-500/20 p-3">
                    <Sparkles size={22} />
                  </div>

                  <div>
                    <h3 className="font-medium">
                      Premium Experience
                    </h3>

                    <p className="text-sm text-zinc-400">
                      Smooth animations and modern
                      communication UI.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-zinc-500">
              <p>© 2026 FlexChat</p>

              <div className="flex items-center gap-5">
                <span className="cursor-pointer hover:text-white">
                  Privacy
                </span>

                <span className="cursor-pointer hover:text-white">
                  Terms
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center justify-center px-5 py-8 sm:px-8">
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
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600">
                <MessageCircle size={24} />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  FlexChat
                </h1>

                <p className="text-xs text-zinc-400">
                  Premium Messaging
                </p>
              </div>
            </div>

            <div className="mb-8 flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              <button
                onClick={() =>
                  setIsLogin(true)
                }
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition-all ${
                  isLogin
                    ? "bg-purple-600 text-white"
                    : "text-zinc-400"
                }`}
              >
                Sign In
              </button>

              <button
                onClick={() =>
                  setIsLogin(false)
                }
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition-all ${
                  !isLogin
                    ? "bg-purple-600 text-white"
                    : "text-zinc-400"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_0_60px_rgba(124,58,237,0.15)] backdrop-blur-3xl">
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">
                  {isLogin
                    ? "Welcome back"
                    : "Create account"}
                </h2>

                <p className="mt-2 text-zinc-400">
                  {isLogin
                    ? "Sign in to continue your conversations."
                    : "Join the next generation messaging platform."}
                </p>
              </div>

              <form className="space-y-5">
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
                        setUsername(
                          e.target.value
                        )
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
                      setEmail(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-300">
                      Password
                    </label>

                    {isLogin && (
                      <button
                        type="button"
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>

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
                        setPassword(
                          e.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          !showPassword
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

                {!isLogin && (
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 accent-purple-600"
                    />

                    <p className="text-xs leading-relaxed text-zinc-500">
                      By creating an account you agree
                      to our Terms and Privacy Policy.
                    </p>
                  </div>
                )}

                <PremiumButton
                  type="button"
                  loading={loading}
                  onClick={handleAuthSuccess}
                >
                  {isLogin
                    ? "Sign In"
                    : "Create Account"}
                </PremiumButton>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}