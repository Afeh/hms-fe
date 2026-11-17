import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger-outline" | "gradient";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white shadow-1 hover:bg-brand-600 active:bg-brand-900 disabled:bg-brand-700/50",
  secondary:
    "border border-line bg-surface text-ink shadow-1 hover:bg-surface-2 active:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2 active:bg-surface-2",
  "danger-outline":
    "border border-danger/50 bg-transparent text-danger hover:bg-danger-soft active:bg-danger-soft",
  gradient: "gradient-brand text-white shadow-2 hover:opacity-95 active:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-small gap-1.5",
  md: "h-11 px-4 text-[0.9375rem] gap-2",
  lg: "h-[52px] px-6 text-base gap-2.5",
  icon: "h-11 w-11 justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
  leadingIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    asChild = false,
    leadingIcon,
    children,
    disabled,
    type,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : "button";
  const icon = loading ? (
    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
  ) : (
    leadingIcon
  );
  // Radix Slot accepts a single child only; fold the icon into that child so
  // `asChild` links keep their icon instead of tearing down the route.
  const content = asChild && icon ? withLeadingIcon(children, icon) : children;

  return (
    <Component
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center rounded-md font-semibold transition-[background-color,color,box-shadow,opacity,transform] duration-[120ms] ease-out",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "motion-safe:active:translate-y-px",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {asChild ? (
        content
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Component>
  );
});

/** Slot needs exactly one element child, so icons join that child's content. */
function withLeadingIcon(children: React.ReactNode, icon: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<{ children?: React.ReactNode }>(children)) return children;
  return React.cloneElement(
    children,
    undefined,
    <>
      {icon}
      {children.props.children}
    </>,
  );
}

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(function IconButton({ className, label, children, type, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors duration-[120ms] hover:bg-surface-2 hover:text-ink disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
