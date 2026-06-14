import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function Skeleton({ className }: Props) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/5",
        className
      )}
    />
  );
}
