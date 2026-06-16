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
    sm: "h-8 w-8",
    md: "h-11 w-11",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[14px] overflow-hidden shadow-lg select-none transition-transform active:scale-95",
        sizes[size],
        className
      )}
      aria-hidden="true"
    >
      <img 
        src="/logo.jpeg" 
        alt="FlexChat Logo" 
        className="w-full h-full object-cover" 
      />
    </div>
  );
}
