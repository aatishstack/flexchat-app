"use client";

import { motion } from "framer-motion";

import {
  Eye,
  EyeOff,
  MessageCircle,
  Shield,
  Sparkles,
} from "lucide-react";

import { useState } from "react";

export default function AuthPage() {

  const [isLogin, setIsLogin] =
    useState(true);

  const [showPassword, setShowPassword] =
    useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070a] text-white">

      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_35%)]" />

      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-purple-600/10 blur-3xl" />

      <div className="absolute bottom-[-150px] right-[-120px] h-[320px] w-[320px] rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">

        {/* LEFT SIDE */}
        <div className="relative hidden overflow-hidden border-r border-white/10 lg:flex">

          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-fuchsia-500/10" />

          <div className="relative flex w-full flex-col justify-between p-12">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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

            {/* Center Content */}
            <div className="max-w-lg">

              <motion.h2
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl font-bold leading-tight tracking-tight"
              >
                Chat smarter.
                <br />
                Connect faster.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-lg leading-relaxed text-zinc-400"
              >
                Secure realtime messaging with modern
                design, lightning-fast performance and
                premium communication experience.
              </motion.p>

              {/* Features */}
              <div className="mt-10 space-y-4">

                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
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
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
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

            {/* Footer */}
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
        <div className="flex items-center justify-center px-6 py-10">

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[440px]"
          >

            {/* Mobile Logo */}
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

            {/* Tabs */}
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

            {/* Form Card */}
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-2xl">

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

                    <input
                      type="text"
                      placeholder="Enter username"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300">
                    Email
                  </label>

                  <input
                    type="email"
                    placeholder="Enter email"
                    className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20"
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

                    <input
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
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 pr-12 text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20"
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

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-purple-600 font-medium text-white shadow-lg shadow-purple-600/20 transition-all duration-300 hover:bg-purple-500"
                >
                  {isLogin
                    ? "Sign In"
                    : "Create Account"}
                </motion.button>

                {/* Divider */}
                <div className="relative py-3">

                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>

                  <div className="relative flex justify-center">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1 text-sm text-zinc-400 backdrop-blur-xl">
                      or continue with
                    </span>
                  </div>

                </div>

                {/* Google */}
                <button
                  type="button"
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] font-medium transition-all duration-300 hover:bg-white/[0.05]"
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="h-5 w-5"
                  />

                  Continue with Google
                </button>

              </form>

            </div>

          </motion.div>

        </div>

      </div>
    </main>
  );
}