import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field, FormError, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRecordVitals } from "@/lib/api/queries";
import { ApiError, messageOf } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import type { Visit } from "@/types/api";

const numeric = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= min && Number(value) <= max),
      `${label} must be between ${min} and ${max}`,
    )
    .optional();

const schema = z
  .object({
    visitId: z.string().min(1, "Choose a visit"),
    measuredAt: z.string().min(1, "Choose when the measurements were taken"),
    temperature: numeric("Temperature", 25, 45),
    pulse: numeric("Pulse", 20, 250),
    systolic: numeric("Systolic pressure", 40, 300),
    diastolic: numeric("Diastolic pressure", 20, 200),
    weight: numeric("Weight", 0.5, 400),
    height: numeric("Height", 20, 260),
  })
  .refine(
    (values) =>
      [values.temperature, values.pulse, values.systolic, values.diastolic, values.weight, values.height].some(
        (value) => value !== undefined && value !== "",
      ),
    { message: "Record at least one measurement", path: ["temperature"] },
  );
type Values = z.infer<typeof schema>;

interface BackendWarning {
  field: string;
  value: number;
  message: string;
}

function nowLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function RecordVitalsDialog({
  patientId,
  openVisits,
  open,
  onOpenChange,
  defaultVisitId,
}: {
  patientId: string;
  openVisits: Visit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVisitId?: string;
}) {
  const toast = useToast();
  const record = useRecordVitals(patientId);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<BackendWarning[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      visitId: defaultVisitId ?? openVisits[0]?._id ?? "",
      measuredAt: nowLocal(),
      temperature: "",
      pulse: "",
      systolic: "",
      diastolic: "",
      weight: "",
      height: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        visitId: defaultVisitId ?? openVisits[0]?._id ?? "",
        measuredAt: nowLocal(),
        temperature: "",
        pulse: "",
        systolic: "",
        diastolic: "",
        weight: "",
        height: "",
      });
      setFormError(null);
      setWarnings([]);
    }
  }, [open, defaultVisitId, openVisits, reset]);

  const submit = handleSubmit(async (values) => {
    if (!values.visitId) {
      setFormError("Choose an open visit to record these measurements against.");
      return;
    }
    setFormError(null);
    const toNumber = (value?: string) => (value === "" || value === undefined ? null : Number(value));
    try {
      const result = await record.mutateAsync({
        visitId: values.visitId,
        body: {
          measured_at: new Date(values.measuredAt).toISOString(),
          temperature_c: toNumber(values.temperature),
          pulse_bpm: toNumber(values.pulse),
          systolic_mmhg: toNumber(values.systolic),
          diastolic_mmhg: toNumber(values.diastolic),
          weight_kg: toNumber(values.weight),
          height_cm: toNumber(values.height),
          // Only set after the API has asked for confirmation (409).
          acknowledge_warnings: warnings.length > 0,
        },
      });
      toast.success(
        "Vitals recorded",
        `${formatDate(result.data.vitals.measured_at)} · ${result.data.vitals.warnings.length} warning${
          result.data.vitals.warnings.length === 1 ? "" : "s"
        }`,
      );
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const data = error.data as { warnings?: BackendWarning[] } | undefined;
        if (data?.warnings?.length) {
          setWarnings(data.warnings);
          setFormError(null);
          return;
        }
      }
      if (error instanceof ApiError && error.fields.length > 0) {
        setFormError(
          `These values are outside physically possible ranges: ${error.fields
            .map((field) => field.message)
            .join("; ")}`,
        );
        return;
      }
      setFormError(messageOf(error, "The measurements could not be recorded."));
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record vitals"
      description="Measurements are attached to an open visit. Unusual values ask for confirmation."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="record-vitals-form" loading={isSubmitting}>
            {warnings.length > 0 ? "Confirm and record" : "Record vitals"}
          </Button>
        </>
      }
    >
      <form id="record-vitals-form" onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />

        {warnings.length > 0 ? (
          <div className="rounded-md border border-warning/30 bg-warning-soft px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-small font-semibold text-warning">
              <TriangleAlert aria-hidden className="h-4 w-4" />
              Confirm unusual values
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-small text-warning">
              {warnings.map((warning) => (
                <li key={`${warning.field}-${warning.value}`}>{warning.message}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-small text-warning">
              Submitting again stores these values with a warning flag.
            </p>
          </div>
        ) : null}

        <Field label="Visit" htmlFor="vitals-visit" error={errors.visitId?.message} required>
          {openVisits.length === 0 ? (
            <p className="rounded-md bg-surface-2 px-3 py-2.5 text-small text-muted">
              This patient has no open visit. Open a visit before recording vitals.
            </p>
          ) : (
            <Select id="vitals-visit" {...register("visitId")}>
              {openVisits.map((visit) => (
                <option key={visit._id} value={visit._id}>
                  {visit.type} · {formatDate(visit.visit_date)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Measured at" htmlFor="vitals-measured" error={errors.measuredAt?.message} required>
          <Input id="vitals-measured" type="datetime-local" {...register("measuredAt")} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Temperature" htmlFor="vitals-temp" error={errors.temperature?.message} hint="°C">
            <Input id="vitals-temp" inputMode="decimal" placeholder="36.8" {...register("temperature")} />
          </Field>
          <Field label="Pulse" htmlFor="vitals-pulse" error={errors.pulse?.message} hint="bpm">
            <Input id="vitals-pulse" inputMode="numeric" placeholder="72" {...register("pulse")} />
          </Field>
          <Field label="Systolic" htmlFor="vitals-sys" error={errors.systolic?.message} hint="mmHg">
            <Input id="vitals-sys" inputMode="numeric" placeholder="120" {...register("systolic")} />
          </Field>
          <Field label="Diastolic" htmlFor="vitals-dia" error={errors.diastolic?.message} hint="mmHg">
            <Input id="vitals-dia" inputMode="numeric" placeholder="80" {...register("diastolic")} />
          </Field>
          <Field label="Weight" htmlFor="vitals-weight" error={errors.weight?.message} hint="kg">
            <Input id="vitals-weight" inputMode="decimal" placeholder="70" {...register("weight")} />
          </Field>
          <Field label="Height" htmlFor="vitals-height" error={errors.height?.message} hint="cm">
            <Input id="vitals-height" inputMode="decimal" placeholder="170" {...register("height")} />
          </Field>
        </div>

        <p className="text-small text-faint">
          Values are checked against clinical ranges. At least one measurement is required.
          {openVisits.length === 0 ? " Open a visit first." : ""}
        </p>
      </form>
    </Modal>
  );
}
