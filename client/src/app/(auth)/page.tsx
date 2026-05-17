"use client";

import { motion } from "framer-motion";

import { Eye, EyeOff, MessageCircle } from "lucide-react";

import axios from "axios";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth.store";

import { tokenStorage } from "@/lib/token";

import { login, register } from "@/services/auth.service";

import AuthBackground from "@/components/auth/auth-background";

import PremiumInput from "@/components/ui/premium-input";

import PremiumButton from "@/components/ui/premium-button";

export default function AuthPage() {
  const router = useRouter();

  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLogin, setIsLogin] = useState(true);

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleAuthSuccess() {
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

      router.push("/chat");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Authentication failed");
      } else {
        setError("Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070a] text-white">
      <AuthBackground />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
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
                <h1 className="text-2xl font-bold tracking-tight">FlexChat</h1>

                <p className="text-sm text-zinc-400">
                  Premium Messaging Platform
                </p>
              </div>
            </motion.div>
          </div>
        </div>

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
            <div className="mb-8 flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition-all ${
                  isLogin ? "bg-purple-600 text-white" : "text-zinc-400"
                }`}
              >
                Sign In
              </button>

              <button
                onClick={() => setIsLogin(false)}
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition-all ${
                  !isLogin ? "bg-purple-600 text-white" : "text-zinc-400"
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_0_60px_rgba(124,58,237,0.15)] backdrop-blur-3xl">
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">
                  {isLogin ? "Welcome back" : "Create account"}
                </h2>
              </div>

              <form className="space-y-5">
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
                      placeholder="Enter password"
                      className="pr-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
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

                <PremiumButton
                  type="button"
                  loading={loading}
                  onClick={handleAuthSuccess}
                >
                  {isLogin ? "Sign In" : "Create Account"}
                </PremiumButton>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
