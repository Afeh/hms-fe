import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn("skeleton h-3 rounded-pill", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
