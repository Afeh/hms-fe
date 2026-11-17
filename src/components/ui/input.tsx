import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  children,
  htmlFor,
  hint,
}: {
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("flex items-center justify-between gap-2 text-small font-semibold text-ink", className)}
    >
      <span>{children}</span>
      {hint ? <span className="text-small font-normal text-faint">{hint}</span> : null}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  help,
  hint,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string;
  help?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} hint={hint}>
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-small font-medium text-danger" role="alert">
          <AlertCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : help ? (
        <p className="text-small font-normal text-faint">{help}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-md border bg-surface px-3 text-[0.9375rem] text-ink placeholder:text-faint transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          CONTROL,
          "h-11 focus-visible:border-brand-500",
          props["aria-invalid"] ? "border-danger" : "border-line",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        CONTROL,
        "min-h-[88px] py-2.5 leading-relaxed focus-visible:border-brand-500",
        props["aria-invalid"] ? "border-danger" : "border-line",
        className,
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          CONTROL,
          "h-11 appearance-none border-line pr-9 focus-visible:border-brand-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

export function Checkbox({
  className,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-[0.9375rem]", className)}>
      <input
        type="checkbox"
        className="h-[18px] w-[18px] rounded-[6px] border-line text-brand-700 accent-brand-700"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

/** A labelled form-level error banner (401, 403, network). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-small font-medium text-danger"
    >
      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
