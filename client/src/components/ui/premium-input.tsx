"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type PremiumInputProps =
  React.InputHTMLAttributes<HTMLInputElement>;

const PremiumInput = React.forwardRef<
  HTMLInputElement,
  PremiumInputProps
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-purple-500 focus:bg-white/[0.05] focus:ring-4 focus:ring-purple-500/20",
        className
      )}
      {...props}
    />
  );
});

PremiumInput.displayName =
  "PremiumInput";

export default PremiumInput;
