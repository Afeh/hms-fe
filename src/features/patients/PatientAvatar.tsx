import * as React from "react";

import { Avatar } from "@/components/ui/avatar";
import { patientsApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types/api";

const SIZES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

type PhotoPatient = Pick<Patient, "_id" | "display_name" | "has_photo" | "photo_updated_at">;

/** A patient's registration photo, falling back to initials when absent or unreadable. */
export function PatientAvatar({
  patient,
  size = "md",
  ring = false,
  className,
}: {
  patient: PhotoPatient;
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const src = patientsApi.photoUrl(patient);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!patient.has_photo || failed) {
    return (
      <Avatar
        name={patient.display_name}
        seed={patient._id}
        size={size}
        ring={ring}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        "inline-block shrink-0 select-none rounded-pill border border-line bg-surface-2 object-cover",
        SIZES[size],
        ring && "ring-2 ring-brand-500/60 ring-offset-2 ring-offset-surface",
        className,
      )}
    />
  );
}
