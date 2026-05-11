"use client";

import { Eye, EyeOff } from "lucide-react";

import { motion } from "framer-motion";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  registerSchema,
  type RegisterInput,
} from "../../lib/validations/auth";

import { api } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [serverError, setServerError] =
    useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const onSubmit = async (
    data: RegisterInput
  ) => {
    try {
      setLoading(true);

      setServerError("");

      const response =
        await api.post("/register", data);

      console.log(response.data);

      router.push("/chat");

    } catch (error: any) {
      setServerError(
        error?.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-6">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_35%)]" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[430px] rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-white">
            Create Account
          </h1>

          <p className="mt-2 text-zinc-400">
            Welcome to FlexChat
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >

          <div>
            <input
              type="text"
              placeholder="Username"
              {...register("username")}
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none focus:border-purple-500"
            />

            {errors.username && (
              <p className="mt-2 text-sm text-red-400">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <input
              type="email"
              placeholder="Email"
              {...register("email")}
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none focus:border-purple-500"
            />

            {errors.email && (
              <p className="mt-2 text-sm text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Password"
                {...register("password")}
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 pr-12 text-white outline-none focus:border-purple-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {errors.password && (
              <p className="mt-2 text-sm text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-red-400">
              {serverError}
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!isValid || loading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-purple-600 font-medium text-white transition-all hover:bg-purple-500 disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </motion.button>

        </form>
      </motion.div>
    </main>
  );
}