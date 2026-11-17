import { cn, avatarTint, initials } from "@/lib/utils";

const SIZES = {
  xs: "h-6 w-6 text-[0.625rem]",
  sm: "h-8 w-8 text-[0.6875rem]",
  md: "h-10 w-10 text-small",
  lg: "h-14 w-14 text-h3",
} as const;

export function Avatar({
  name,
  seed,
  size = "md",
  ring = false,
  className,
}: {
  name: string;
  seed?: string;
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
}) {
  const tint = avatarTint(seed ?? name);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-pill font-semibold",
        SIZES[size],
        tint,
        ring && "ring-2 ring-brand-500/60 ring-offset-2 ring-offset-surface",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
