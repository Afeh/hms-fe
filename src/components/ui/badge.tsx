import * as React from "react";
import { Lock, TriangleAlert, CircleCheck, CircleDot, CircleSlash, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AttachmentStatus, PatientStatus, VisitStatus, VitalsStatus } from "@/types/api";

type Tone = "brand" | "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  neutral: "bg-surface-2 text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  icon: Icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[0.75rem] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> : null}
      {children}
    </span>
  );
}

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  if (status === "active") return <Badge tone="success" icon={CircleCheck}>Active</Badge>;
  if (status === "deceased") return <Badge tone="danger" icon={CircleSlash}>Deceased</Badge>;
  return <Badge tone="neutral" icon={CircleDot}>Inactive</Badge>;
}

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  if (status === "open") return <Badge tone="brand" icon={CircleDot}>Open</Badge>;
  if (status === "closed") return <Badge tone="neutral" icon={Lock}>Closed</Badge>;
  return <Badge tone="warning" icon={CircleSlash}>Cancelled</Badge>;
}

export function VitalsStatusBadge({ status }: { status: VitalsStatus }) {
  if (status === "entered_in_error") {
    return <Badge tone="warning" icon={TriangleAlert}>Entered in error</Badge>;
  }
  return <Badge tone="success" icon={CircleCheck}>Active</Badge>;
}

export function AttachmentStatusBadge({ status }: { status: AttachmentStatus }) {
  return status === "uploaded" ? (
    <Badge tone="success" icon={CircleCheck}>Uploaded</Badge>
  ) : (
    <Badge tone="neutral" icon={CircleDot}>Pending</Badge>
  );
}

export function WarningChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-warning-soft px-2.5 py-1 text-[0.75rem] font-semibold text-warning">
      <TriangleAlert aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
      {children}
    </span>
  );
}
