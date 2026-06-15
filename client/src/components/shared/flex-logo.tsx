"use client";

import { cn } from "@/lib/utils";

type FlexLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "solid" | "soft" | "ghost";
};

export default function FlexLogo({
  size = "md",
  className,
  variant = "solid",
}: FlexLogoProps) {
  const sizes = {
    sm: "h-8 w-8 text-lg",
    md: "h-11 w-11 text-xl",
    lg: "h-14 w-14 text-2xl",
    xl: "h-20 w-20 text-4xl",
  };

  const variants = {
    solid: "bg-[var(--fc-primary)] text-white shadow-lg shadow-[rgba(var(--fc-primary-rgb),0.3)]",
    soft: "bg-[rgba(var(--fc-primary-rgb),0.1)] text-[var(--fc-primary)] border border-[var(--fc-primary)]/20",
    ghost: "text-[var(--fc-primary)]",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[14px] font-black tracking-tighter select-none transition-transform active:scale-95",
        sizes[size],
        variants[variant],
        className
      )}
      aria-hidden="true"
    >
      F
    </div>
  );
}
