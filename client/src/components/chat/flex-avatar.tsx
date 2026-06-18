"use client";

import {
  useState,
} from "react";

import { getAvatarInitial } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type FlexAvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  presence?: "online" | "offline" | "away" | null;
  isStorySeen?: boolean | null;
  hasStory?: boolean;
};

export default function FlexAvatar({
  src,
  name,
  className,
  imageClassName = "h-full w-full object-cover",
  presence,
  isStorySeen,
  hasStory,
}: FlexAvatarProps) {
  const [
    failedSrc,
    setFailedSrc,
  ] = useState<string | null>(null);
  
  const canUseImage =
    !!src && failedSrc !== src;

  const initials = getAvatarInitial(name);

  return (
    <div className={cn("relative shrink-0", className)}>
      {/* Story Ring */}
      {hasStory && (
        <div 
          className={cn(
            "absolute -inset-[3px] rounded-full p-[2px]",
            isStorySeen 
              ? "bg-white/10" 
              : "bg-gradient-to-tr from-[#7C4FF0] via-[#A78BFA] to-[#7C4FF0] animate-spin-slow"
          )}
          style={{ animationDuration: '4s' }}
        >
          <div className="h-full w-full rounded-full bg-[#0C0C10]" />
        </div>
      )}

      {/* Main Avatar Surface */}
      <div 
        className={cn(
          "relative h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center",
          !canUseImage && "bg-[#16161D]"
        )}
        style={{
          maskImage: presence 
            ? 'radial-gradient(circle 12px at calc(100% - 6px) calc(100% - 6px), transparent 100%, white 100%)'
            : 'none',
          WebkitMaskImage: presence 
            ? 'radial-gradient(circle 12px at calc(100% - 6px) calc(100% - 6px), transparent 100%, white 100%)'
            : 'none',
        }}
      >
        {canUseImage ? (
          <img
            src={src}
            alt=""
            className={imageClassName}
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(src ?? null)}
          />
        ) : (
          <span className="text-[inherit] font-bold text-white/90">
            {initials}
          </span>
        )}
      </div>

      {/* Presence Indicator */}
      {presence && (
        <div 
          className={cn(
            "absolute bottom-[2px] right-[2px] h-[11px] w-[11px] rounded-full border-2 border-[#0C0C10]",
            presence === "online" ? "bg-[#22C55E]" : "bg-white/20"
          )} 
        />
      )}
    </div>
  );
}

