import * as React from "react";
import { MoreHorizontal, TriangleAlert } from "lucide-react";

import { VitalsStatusBadge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn, formatDateTime } from "@/lib/utils";
import { useSession } from "@/lib/auth/SessionProvider";
import type { Vitals } from "@/types/api";

export function VitalsList({
  vitals,
  onMarkError,
  markingError,
}: {
  vitals: Vitals[];
  onMarkError?: (vitals: Vitals, reason: string) => Promise<void>;
  markingError?: boolean;
}) {
  const { has } = useSession();
  const [target, setTarget] = React.useState<Vitals | null>(null);

  const pressure = (record: Vitals) =>
    record.systolic_mmhg !== null && record.systolic_mmhg !== undefined
      ? `${record.systolic_mmhg}/${record.diastolic_mmhg ?? "—"}`
      : "—";

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {["Measured", "Recorded by", "Temp", "Pulse", "Blood pressure", "Weight / height", "BMI", "Status", ""].map(
                (heading, index) => (
                  <th key={heading || index} scope="col" className="px-4 py-2.5 text-micro text-faint first:pl-5">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {vitals.map((record) => (
              <tr key={record._id} className="border-b border-line/70 last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 pl-5">
                  <p className="text-small font-medium text-ink">{formatDateTime(record.measured_at)}</p>
                  {record.warnings.length > 0 ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] font-medium text-warning">
                      <TriangleAlert aria-hidden className="h-3 w-3" />
                      {record.warnings.length} warning{record.warnings.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-small text-muted">
                  {record.recorded_by_name ?? "Unknown"}
                </td>
                <td className="px-4 py-3 font-mono text-small tabular text-ink">
                  {record.temperature_c ?? "—"}
                  {record.temperature_c !== null && record.temperature_c !== undefined ? "°C" : ""}
                </td>
                <td className="px-4 py-3 font-mono text-small tabular text-ink">
                  {record.pulse_bpm ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-small tabular text-ink">{pressure(record)}</td>
                <td className="px-4 py-3 font-mono text-small tabular text-ink">
                  {record.weight_kg ?? "—"} / {record.height_cm ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-small tabular text-ink">{record.bmi ?? "—"}</td>
                <td className="px-4 py-3">
                  <VitalsStatusBadge status={record.status} />
                </td>
                <td className="px-2 py-3 text-right">
                  {has("vitals:write") && record.status === "active" && onMarkError ? (
                    <Menu
                      trigger={
                        <IconButton label="Vitals actions" className="h-9 w-9">
                          <MoreHorizontal aria-hidden className="h-4 w-4" />
                        </IconButton>
                      }
                    >
                      <MenuLabel>{formatDateTime(record.measured_at)}</MenuLabel>
                      <MenuItem destructive onSelect={() => setTarget(record)}>
                        Mark entered in error
                      </MenuItem>
                    </Menu>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {vitals.map((record) => (
          <li key={record._id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-small font-semibold text-ink">{formatDateTime(record.measured_at)}</p>
                <p className="mt-0.5 text-small text-muted">
                  {record.temperature_c !== null && record.temperature_c !== undefined
                    ? `${record.temperature_c}°C`
                    : "—"}{" "}
                  · {record.pulse_bpm ?? "—"} bpm · {pressure(record)} mmHg
                </p>
                <p className="text-small text-muted">
                  {record.weight_kg ?? "—"} kg · {record.height_cm ?? "—"} cm · BMI{" "}
                  {record.bmi ?? "—"}
                </p>
                <p className="mt-0.5 text-small text-muted">
                  Recorded by {record.recorded_by_name ?? "Unknown"}
                </p>
              </div>
              <VitalsStatusBadge status={record.status} />
            </div>
            {record.warnings.length > 0 ? (
              <p className="mt-1.5 flex items-center gap-1 text-[0.6875rem] font-medium text-warning">
                <TriangleAlert aria-hidden className="h-3 w-3" />
                {record.warnings.map((warning) => warning.message).join(" · ")}
              </p>
            ) : null}
            {has("vitals:write") && record.status === "active" && onMarkError ? (
              <button
                type="button"
                onClick={() => setTarget(record)}
                className="mt-2 text-small font-semibold text-danger hover:underline"
              >
                Mark entered in error
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <MarkErrorDialog
        target={target}
        onClose={() => setTarget(null)}
        onConfirm={async (reason) => {
          if (!target || !onMarkError) return;
          await onMarkError(target, reason);
          setTarget(null);
        }}
        loading={markingError}
      />
    </>
  );
}

function MarkErrorDialog({
  target,
  onClose,
  onConfirm,
  loading,
}: {
  target: Vitals | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}) {
  const toast = useToast();
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setReason("");
    setError(null);
  }, [target]);

  return (
    <Modal
      open={Boolean(target)}
      onOpenChange={(open) => !open && onClose()}
      title="Mark vitals as entered in error"
      description="The record stays in history with your reason, so the audit trail is preserved."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            loading={loading}
            onClick={async () => {
              if (!reason.trim()) {
                setError("Give a short reason for the correction.");
                return;
              }
              try {
                await onConfirm(reason.trim());
                toast.success("Vitals marked as entered in error");
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "The correction could not be saved.");
              }
            }}
          >
            Mark entered in error
          </Button>
        </>
      }
    >
      {target ? (
        <div className="space-y-4">
          <div className={cn("rounded-md bg-surface-2 px-3 py-2.5 text-small text-muted")}>
            Measured {formatDateTime(target.measured_at)} ·{" "}
            <span className="font-mono">
              {target.temperature_c ?? "—"}°C / {target.pulse_bpm ?? "—"} bpm
            </span>
          </div>
          <Field label="Reason" htmlFor="vitals-error-reason" error={error ?? undefined} required>
            <Textarea
              id="vitals-error-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="e.g. Wrong patient selected"
              aria-invalid={Boolean(error)}
            />
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}
