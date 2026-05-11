"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface Props {
  label: string;
  type?: string;
  placeholder: string;
  error?: string;
  register: any;
}

export default function AuthInput({
  label,
  type = "text",
  placeholder,
  error,
  register,
}: Props) {
  const [showPassword, setShowPassword] =
    useState(false);

  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-300">
        {label}
      </label>

      <div className="relative">
        <input
          type={
            isPassword
              ? showPassword
                ? "text"
                : "password"
              : type
          }
          placeholder={placeholder}
          {...register}
          className={`
            w-full rounded-2xl border
            bg-zinc-900/70
            px-4 py-3
            text-white
            outline-none
            transition-all
            duration-300
            placeholder:text-zinc-500
            focus:border-purple-500
            focus:ring-2
            focus:ring-purple-500/30
            ${
              error
                ? "border-red-500"
                : "border-zinc-800"
            }
          `}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}