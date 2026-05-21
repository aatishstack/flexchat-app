"use client";

import {
  useState,
} from "react";

import { getAvatarInitial } from "@/lib/user-display";

type FlexAvatarProps = {
  src?: string | null;
  name?: string | null;
  className: string;
  imageClassName?: string;
};

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

  return (
    <div className={className}>
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
        <span>
          {getAvatarInitial(name)}
        </span>
      )}
    </div>
  );
}
