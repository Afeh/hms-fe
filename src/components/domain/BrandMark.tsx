import { cn } from "@/lib/utils";

/** The single brand moment: a soft gradient tile with a clinical cross. */
export function BrandMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "sm" ? "h-8 w-8 rounded-sm" : size === "lg" ? "h-14 w-14 rounded-lg" : "h-10 w-10 rounded-md";
  return (
    <span
      aria-hidden
      className={cn("gradient-brand inline-flex items-center justify-center shadow-2", dimensions, className)}
    >
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] text-white" fill="none" aria-hidden>
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
