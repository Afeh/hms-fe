import * as React from "react";
import { ShieldOff, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  help,
  action,
  className,
  tone = "neutral",
}: {
  icon?: LucideIcon;
  title: string;
  help?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-lg",
          tone === "danger" ? "bg-danger-soft text-danger" : "gradient-soft text-brand-700",
        )}
      >
        {Icon ? <Icon className="h-6 w-6" strokeWidth={1.75} /> : null}
      </div>
      <p className="text-h3 text-ink">{title}</p>
      {help ? (
        <p className="mt-1.5 max-w-[46ch] text-[0.9375rem] text-muted">{help}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ForbiddenState({ help }: { help?: string }) {
  return (
    <EmptyState
      icon={ShieldOff}
      tone="danger"
      title="No access to this page"
      help={help ?? "Your role does not include permission for this area. Ask a hospital administrator if you need it."}
    />
  );
}
