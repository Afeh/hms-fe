import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { IconButton } from "./button";

export type ModalVariant = "dialog" | "drawer" | "sheet";

/**
 * One accessible modal primitive covering the three shapes in guide §9:
 * a centred dialog, a right-side drawer (sheet on small screens) and a bottom sheet.
 * Radix supplies the focus trap, `Esc` handling and aria roles.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = "dialog",
  className,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: ModalVariant;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(7,16,19,.5)] backdrop-blur-[2px] motion-safe:animate-[overlay-in_160ms_ease-out]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col border border-line bg-surface shadow-3 focus:outline-none motion-safe:animate-[sheet-in_240ms_cubic-bezier(0.22,1,0.36,1)]",
            variant === "dialog" &&
              "left-1/2 top-1/2 max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-xl",
            variant === "drawer" &&
              "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:max-h-none lg:w-[480px] lg:rounded-none lg:rounded-l-xl",
            variant === "sheet" &&
              "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl",
            className,
          )}
        >
          {variant !== "dialog" ? (
            <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-pill bg-line lg:hidden" />
          ) : null}
          <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-h2 text-ink">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-small font-normal text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close" className="-mr-1.5 -mt-1.5 shrink-0">
                <X aria-hidden className="h-5 w-5" strokeWidth={1.75} />
              </IconButton>
            </DialogPrimitive.Close>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", contentClassName)}>
            {children}
          </div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-surface px-4 font-semibold text-ink hover:bg-surface-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-md px-4 font-semibold transition-colors disabled:opacity-60",
              tone === "danger"
                ? "border border-danger/50 bg-danger-soft text-danger hover:bg-danger hover:text-white"
                : "bg-brand-700 text-white hover:bg-brand-600",
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
