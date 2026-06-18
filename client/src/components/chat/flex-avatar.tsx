"use client";

import {
  useState,
} from "react";

import { getAvatarInitial } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type FlexAvatarProps = {
  src?: string | null;
  name?: string | null;
  className: string;
  imageClassName?: string;
};

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

function getAvatarColorClass(name?: string | null) {
  if (!name) return "bg-[#16161D]";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function FlexAvatar({
  src,
  name,
  className,
  imageClassName = "h-full w-full object-cover",
}: FlexAvatarProps) {
  const [
    failedSrc,
    setFailedSrc,
  ] = useState<string | null>(null);
  const canUseImage =
    !!src && failedSrc !== src;
  
  const fallbackColor = getAvatarColorClass(name);

  return (
    <div className={cn(className, !canUseImage && fallbackColor)}>
      {canUseImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={imageClassName}
          loading="lazy"
          decoding="async"
          onError={() =>
            setFailedSrc(src ?? null)
          }
        />
      ) : (
        <span className="text-white drop-shadow-sm">
          {getAvatarInitial(name)}
        </span>
      )}
    </div>
  );
}

