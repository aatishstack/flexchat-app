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
        "fc-input h-14 w-full rounded-2xl border px-4 text-sm outline-none transition-all duration-300 focus:ring-4 focus:ring-[var(--fc-focus-ring)]",
        className
      )}
      {...props}
    />
  );
});

PremiumInput.displayName =
  "PremiumInput";

export default PremiumInput;
